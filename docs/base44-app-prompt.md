# Prompt: Build "Kutz" (CutBook) — a Barbershop Booking Platform

You are building a production-grade mobile app from scratch. Follow this spec exactly. Use the given stack, design system, data model, and business rules. Do NOT invent features or change business logic. Where the spec says "DB enforces", put the rule in the database, never trust the client.

---

## 1. Product overview

Kutz is a multi-role barbershop booking platform for iOS + Android (Expo/React Native). Four account types share one app and are routed by role after sign-in:

- **Customer** — discovers barbershops, favorites them, books services with specific barbers, reviews past visits, earns loyalty rewards.
- **Barber** — a staff member of one or more shops; runs a live "work session" per workday (start/pause/resume/end, start & finish cuts, walk-ins, delay tracking), sees schedule and clients.
- **Owner** — creates and manages shops (services, hours, gallery), manages staff via invitation codes, manages the loyalty program, sees dashboard + all bookings, double-press confirms for destructive actions.
- **Admin** — platform-level dashboard, browse/search all shops and users, approve/suspend shops, disable users, set settings. (Admin is never self-selectable — only granted via the backend.)

Branding: app display name "Kutz", yellow accent used in the app icon (#FABA23), scheme `cutbook`.

---

## 2. Tech stack (fixed)

- Expo SDK 54, React Native 0.81.5, React 19, New Architecture, `expo-router` v6 (typed routes), `react-compiler` enabled.
- Path alias `@/` → project root. TypeScript, Prettier/4-space indent, named exports only, NO comments unless asked.
- Auth: **Clerk** (`@clerk/expo` v4) — email/password sign-up/sign-in, email verification, forgot/reset password, account deletion (soft-delete via webhook). Never build your own auth.
- Backend/data: **Supabase** (Postgres) with RLS + SECURITY DEFINER RPCs for business logic. Client uses `@supabase/supabase-js`.
- Icons: `Ionicons` from `@expo/vector-icons`. Images: `expo-image`. Other deps already used: `expo-blur`, `expo-haptics`, `expo-image-picker`, `expo-secure-store`, `expo-clipboard`, `react-native-safe-area-context`, `react-native-reanimated`, `react-native-gesture-handler`.
- NO native-only libraries (managed workflow, no `android/`/`ios/` folders). `edgeToEdgeEnabled: true`, `softwareKeyboardLayoutMode: "resize"`, portrait only.

---

## 3. Design system (tokens, reuse everywhere — never inline new colors/spacing/radii)

```ts
colors = {
  primary: "#000", primaryDark: "#0052AB", primarySoft: "#EAF2FE",
  background: "#ffffff", surface: "#fafafa", text: "#18181b", muted: "#71717a",
  border: "#e4e4e7", danger: "#dc2626", dangerSoft: "#fee2e2",
  success: "#16a34a", successSoft: "#dcfce7",
  warning: "#b45309", warningSoft: "#fef3c7",
  slate: "#94A3B8", slateSoft: "#e2e8f0", blue: "#3B82F6", blueSoft: "#dbeafe",
  green: "#22C55E", greenSoft: "#dcfce7", cyan: "#06B6D4", cyanSoft: "#cffafe",
  violet: "#8B5CF6", violetSoft: "#ede9fe", white: "#fff", black: "#000"
}
spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
radius = { sm: 8, md: 12, lg: 16, full: 9999 }
```

Only allowed hard-coded badge hexes: active `#dcfce7`, deleted/danger `#fee2e2`, role/amber `#fef3c7` bg + `#b45309` text.

### Shared UI components (`components/ui/`)
- **Screen** — root wrapper for every screen (`scroll`, `centered`, `style` props). `SafeAreaView` top-only when inside a tab (content runs behind the floating tab bar to screen edge), top+bottom otherwise. `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ? "padding" : "height"}` on BOTH platforms.
- **Button** — height 50, radius full. Variants `primary | outline | ghost | danger | dangerOutline | successOutline`. Props `loading`, `disabled`, `style`. No `size` prop.
- **TextField** — label + pill input. Props `label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType, error, prefix`. `keyboardType` only accepts `"numeric" | "phone-pad" | "default" | "email-address"`.
- **Avatar** — `fullName, imageUrl, size`; initials fallback on `primarySoft`.
- **UsernameField** — username input with debounced availability check against the DB.
- **PhoneInput** — country-code picker (bottom sheet) + phone input.
- **ProfilePicture** — avatar with camera edit affordance (Ionicons).
- **NoticeBanner** — full-pill 48-high toast; tones success (`#dcfce7`/success), danger (`#fee2e2`/danger), role (`primarySoft`/`primaryDark`); auto-dismiss 3s; `variant: "bordered" | "soft"`.
- **FilterChip** — active = `colors.primary` bg + white text; inactive = `surface` + `border` + muted text.
- **BottomSheet** — transparent modal, `animationType="slide"`, translucent status+navigation bars, absolute backdrop Pressable to close, card radius 28 top corners, drag-handle, pan-to-dismiss (`PanResponder`), bottom padding = `spacing.xl + insets.bottom`. iOS-only KAV `padding`; on Android pad scroll content by `keyboardHeight` (from `lib/useKeyboardHeight`) so the sheet stays glued to the bottom.
- **EmptyState** — title + subtitle + optional action button.
- Plus: BookingCard, BookingStatusBadge, ShopCard, StarRating, StatCard, SectionHeader, ReviewCard, DetailsCard, StatusBadge, ReputationBadge, DeleteAccountButton, SignOutButton, ProfileSummary, etc.

### Layout / navigation
- Custom floating iOS-style tab bar (`components/tab-bar/`): capsule 60 tall, `topMargin 12`, `bottomMargin 6`, `horizontalMargin 14`, icon size 28. Band height = `78 + insets.bottom`, positioned `absolute bottom: 0`. Tab content has NO bottom padding so it extends behind the bar. Tab icons are custom PNGs (home_2, discover_2, bookings_2, saved_2, dashboard_2, schedule_2, users_2, shops_2, settings_2) with an Ionicons fallback; profile tab uses `person` Ionicons.
- Per-role tab sets: customer `home, discover, bookings, favorites, profile`; barber `dashboard, schedule, clients, profile`; owner `dashboard, bookings, staff, shop, profile`; admin `dashboard, shops, users, settings`.
- Guard every route by role via `RoleGuard`; redirect post-login via `ROLE_ROUTES` (`/customer/home`, `/barber/dashboard`, `/owner/dashboard`, `/admin/dashboard`).

### Page grammar (match it on every screen)
1. Header: 24/700 title + muted 13 subtitle.
2. Search: pill `TextInput` (height 48, radius full, `surface` bg, `border` stroke, paddingRight 44) wrapped in a View with an absolute right-aligned X clear button (Ionicons `close`, 18, muted) shown only when text exists.
3. Filter chips: horizontal ScrollView of pill Pressables.
4. List: FlatList of Pressable cards (Avatar 44 + info + badges), `RefreshControl`, `onEndReached` "Load more", `ListEmptyComponent`.
5. Bottom sheets: as described above.
6. Copy feedback: pill `primarySoft` bg / `primaryDark` text / 12/600 shows "Copy" → "Copied" 1.5s (invitation codes, phone, etc.).
7. Confirm buttons: double-press — first press swaps label to "Confirm … (5)" and starts a 5s countdown; reverts at 0; timer cleared on confirm/cancel/close. Use `useConfirmCountdown`.
8. Toasts via `useNotice` + `NoticeBanner`; destructive flows via `useConfirmCountdown`; sheets via `useSheetDrag`.

---

## 4. Auth & onboarding flow

1. `welcome` screen → Sign up / Sign in. Sign-up captures email + password, then **email verification is required**.
2. `choose-role`: pick `customer | barber | owner` (admin not offered). This is stored as the profile role.
3. `complete-profile`: first + last name, **username** (must be unique, debounced check), optional phone/avatar.
4. Role-specific onboarding: barbers complete a "professional" profile (bio, specialties, etc.); owners create their shop (name, address, services, hours, gallery) in an onboarding wizard.
5. `account-info` / `edit-profile` / `settings` screens manage profile + notification preferences + account deletion (Clerk `user.delete()` → webhook soft-deletes the profile row).
6. Forgot / reset password via Clerk.

Clerk ↔ Supabase sync: a **webhook edge function** maps Clerk user events into the `profiles` table (delivery is eventual — new users can take minutes to appear). The webhook only accepts roles `customer|barber|owner` (never `admin`), maps `phone` from Clerk unsafe_metadata (fallback phone_numbers), mirrors `profileCompleted → onboarding_completed`, and soft-deletes on `user.deleted`.

---

## 5. Database model (Supabase — source of truth)

23 tables. Auth identity = `profiles.id` (Clerk `sub`, text). Full ER in `docs/er-diagram.md`. Key tables and rules:

- **profiles** — id (Clerk sub), email (partial-unique among active rows: one ACTIVE account per email, deleted rows keep history), first/last name, username (unique), phone (partial unique), avatar_url, bio, city, role (`customer|barber|owner|admin`), `onboarding_completed`, `account_status` generated (`active|deleted`), `deleted_at` soft-delete, last_active_at. FKs from shops/shop_members/bookings/reviews use `ON DELETE RESTRICT` → deletion is always soft.
- **shops** — name, slug (unique), description, logo_url, address (line1/2, city, state, country, postal), lat/lng, phone, email, website, `status (pending|approved|suspended)`, is_verified, is_active, rating_avg + rating_count (trigger-maintained), created_by FK, deleted_at.
- **shop_members** — shop_id, profile_id, `member_role (owner|manager|barber)`, display_name, avatar_url, joined_at, removed_at (soft delete).
- **services** — shop_id, name, description, duration_minutes, price_cents, category, is_active, sort_order.
- **staff_services** — junction shop_members × services with optional per-staff price/duration overrides, is_active.
- **bookings** — shop_id, customer_id, staff_id, service_id, `status (pending|confirmed|completed|cancelled|no_show)`, starts_at/ends_at, **snapshots** of service name/price/duration, `applied_reward_type/title/value` (loyalty reward snapshot), note, cancel_reason, cancelled_at, cancelled_by_id. **DB prevents double-booking** via GiST EXCLUDE `(staff_id, tstzrange(starts_at, ends_at, '[)'))` WHERE status NOT IN ('cancelled','no_show').
- **working_hours** — shop_id, day_of_week (0=Sun..6=Sat), opens_at/closes_at, is_closed; unique (shop_id, day).
- **availability** — shop_member_id, day_of_week, starts_at/ends_at; unique (member, day, start).
- **time_offs** — shop_member_id, starts_at, ends_at, reason.
- **favorites** — customer_id, shop_id; unique (customer, shop).
- **reviews** — shop_id, customer_id, booking_id (nullable, SET NULL), rating 1–5, comment, author_name (trigger snapshot), owner_response, responded_at, `status (pending|published|hidden|removed)`; unique (shop, customer). Shop aggregates maintained by triggers.
- **notifications** — recipient_id, type, title, body, data jsonb, read_at. Also used internally for `loyalty_reward_unlocked`.
- **push_tokens**, **shop_gallery** (object_path → shop-gallery bucket), **portfolio_images** (→ portfolio bucket), **settings** (1:1 prefs jsonb), **audit_log** (actor, action, entity_type/id, before/after jsonb, ip), **platform_settings** (key/value).
- Storage buckets: `avatars`, `shop-logos`, `shop-gallery`, `portfolio` (public, images only; RLS path rules by owning id).

### Loyalty system (a flagship feature)
- `loyalty_programs` — one per shop (shop_id unique), `enabled` gates unlocks/redemption/UI.
- `loyalty_milestones` — reward ladder; unique (program_id, visit_count); `reward_type (percentage_discount | fixed_discount | free_service | custom)`; value CHECK: percentage 1–100, fixed/free 0 or null, custom 0–100000. `custom` requires a title/description the owner displays.
- `customer_loyalty` — per (customer, shop) card: total_completed_visits, current_streak, best_streak (all CHECK >= 0, best/total never decrease), last_qualifying_visit_at, last_streak_break_at.
- `loyalty_visits` — per-booking award, `booking_id UNIQUE` → idempotent (double FINISH CUT can't double-count); `increment_streak` records streak math at award time.
- `customer_rewards` — per (customer_loyalty, milestone) unique → each milestone redeemable once; `status (unlocked → redeemed → expired)`.
- **Business rules (in DB, never client):** visits count even when program disabled; `enabled` only gates unlocks/reconciliation/redemption/UI. Streak breakers: `no_show`, or customer-initiated cancel < 24h before `starts_at`. Award via trigger on booking→completed; `reconcile_customer_loyalty` RPC recomputes visits/streak/rewards idempotently; rewards unlock → insert notification. `redeem_reward` RPC only against an upcoming `pending|confirmed` booking at the same shop while program enabled; snapshots reward onto `bookings.applied_reward_*` (barbers can see it; they can't read customer_rewards under RLS). All loyalty writes via SECURITY DEFINER RPCs granted to `authenticated`: `award_loyalty_visit` (trigger), `reconcile_customer_loyalty`, `set_loyalty_program`, `save_loyalty_milestone`, `delete_loyalty_milestone`, `redeem_reward`. Tables are SELECT-only under RLS.

### Customer reputation (beta)
- A per-customer reputation level/score exists (migrations `20260811100000_customer_reputation.sql` family). Backend-computed, never client-controlled.

### RLS summary
- Every table has RLS. Patterns: customers see own data (own bookings, own loyalty cards/rewards, own reviews); barbers see own memberships/schedule/bookings where they are staff; owner/manager see their shop's data; admin sees everything; loyalty/audit tables locked down. All writes through SECURITY DEFINER RPCs; tables are read-only via RLS where business rules exist.

---

## 6. Screens & features per role

### Customer
- **Home** — greeting by time of day (`greetingFor`), "Top" shops + "Newest" shops sections (10 each) as ShopCards.
- **Discover** — search + filter chips (service category, price, rating, distance?), browse all shops with pagination, shop cards.
- **Shop detail** (`/customer/shop/[id]`) — hero, gallery, about, working hours, services list, barbers with profiles + portfolios, availability-based booking flow, reviews section with average + list, loyalty card view (`ShopLoyaltyCard`: stats, progress bar, milestone ladder, redeem buttons — BottomSheet picker when >1 upcoming booking), favorite toggle.
- **Bookings** — list of bookings with status badges, filter chips, detail bottom sheet (cancel with double-press, review with star rating sheet), "applied reward" badge on cards.
- **Favorites** — favorited shops list.
- **Profile** — profile summary, account info, edit profile, settings, notification prefs, sign out, delete account.

### Barber
- **Dashboard** — today's stats, upcoming appointments, double-press "Leave shop" for memberships.
- **Schedule** — calendar/week view of own bookings, clients, availability + time-off management.
- **Clients** — list of customers who booked with them.
- **Work session** (`/barber/work-session`) — THE core daily tool: start workday, live queue of appointments with timer/countdown, start cut / finish cut (haptics, confirm), pause/resume, extend booking, walk-in add, delay tracking (`formatDelay`), end workday with summary (`summarizeDay`), no-show marking (double-press), app-background/AppState resilience. FINISH CUT triggers the loyalty award trigger (idempotent).
- **Profile** — own professional info, portfolio, memberships.

### Owner
- **Dashboard** — revenue/booking stats (StatCards), recent activity.
- **Bookings** — all shop bookings, filter by status, staff booking sheet.
- **Staff** — member list (owner/manager/barber), add staff via **single-use invitation codes** (copy-to-clipboard with "Copied" feedback), manage manager/barber roles, remove members (frees invitation code), leave-shop rules, staff booking sheet.
- **Shop** — edit shop details, services (CRUD with per-staff overrides), working hours, gallery, and the **loyalty program manager** (`OwnerLoyaltySection`: enable switch + milestone ladder editor — add/edit/delete milestones with double-press confirm).
- **Profile** — account info, edit profile, settings, sign out, delete account.

### Admin
- **Dashboard** — platform stats.
- **Shops** — browse/search all shops, approve/suspend, view detail, admin sheet actions.
- **Users** — search all profiles (name/email/username), role badges, `account_status` active/deleted, disable actions with double-press confirm + action modal, notice banner.
- **Settings** — platform settings editor.

---

## 7. Cross-cutting UX rules

- **Keyboard:** on every screen the main `Screen` KAV uses `behavior={Platform.OS === "ios" ? "padding" : "height"}` (Android `resize` is inert under edge-to-edge SDK 54; without this the keyboard covers inputs). Bottom-sheet modals: KAV iOS-only + Android keyboardHeight bottom padding. Always `Keyboard.dismiss()` before closing a modal that had focus.
- **Loading:** centered ActivityIndicator on first load; pull-to-refresh; inline error messages with retry.
- **Idempotency & safety:** every critical action is DB-idempotent; destructive UI actions use the double-press 5s countdown.
- **Empty states** everywhere lists can be empty.
- **Formatting:** `lib/format.ts` — cents↔currency, time, date, relative, greeting, countdown.
- **Verification:** run `npx tsc --noEmit` and `npx eslint <file>` after changes; code must pass both.

---

## 8. Deliverable expectations

Build the full Expo + Clerk + Supabase project (schema migrations, RLS, triggers, RPCs, webhook function, and all screens/components per this spec). Prioritize the customer booking flow, the barber work-session, the owner shop/loyalty management, and admin oversight. Keep the design system exact. Ship clean TypeScript, no mock data, everything backed by the database.
