# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# CutBook Design System (follow this on every new page/screen)

The admin Users page (`app/admin/(tabs)/users.tsx`) is the reference implementation. New pages must reuse the same components, tokens, and patterns. Do NOT invent new spacing/colors/radii inline.

## Stack
- Expo SDK 54, React Native 0.81.5, expo-router (typed routes), React 19, New Architecture, edge-to-edge (`edgeToEdgeEnabled: true`, `softwareKeyboardLayoutMode: "resize"`), managed project (no `android/`/`ios/` folders → NO native-only deps like react-native-keyboard-controller).
- Path alias `@/` → project root. Style: no comments unless asked; Prettier/4-space; named exports.

## Design tokens (`lib/theme.ts` — import `{ colors, spacing, radius }`)
- colors: `primary #000`, `primaryDark #0052AB`, `primarySoft #EAF2FE`, `background #fff`, `surface #fafafa`, `text #18181b`, `muted #71717a`, `border #e4e4e7`, `danger #dc2626`, `success #16a34a`.
- spacing: `xs 4, sm 8, md 16, lg 24, xl 32, xxl 48`.
- radius: `sm 8, md 12, lg 16, full 9999`.
- Allowed hard-coded badge hexes (from Users page): `#dcfce7` (active), `#fee2e2` (deleted/danger), `#fef3c7` bg + `#b45309` text (role/amber). Everything else must come from tokens.

## Shared UI components (`components/ui/`)
- **`Screen`** — root wrapper for every screen. Props: `scroll`, `centered`, `style`. `SafeAreaView` edges: top-only when inside a tab (content must run behind the floating tab bar to the screen edge), top+bottom otherwise. **Keyboard handling (SDK 54 edge-to-edge): `KeyboardAvoidingView` uses `behavior={Platform.OS === "ios" ? "padding" : "height"}` — Android `softwareKeyboardLayoutMode: "resize"` is a NO-OP on Android 15+ (edge-to-edge is enforced), so the keyboard overlays content unless KAV has a real behavior. The old "never set KAV behavior on Android" rule applied pre-edge-to-edge when resize actually resized the window (KAV then double-handled → white strip). Do not revert to `undefined` on Android.**
- **`Button`** — variants: `primary | outline | ghost | danger | dangerOutline | successOutline`; props `loading`, `disabled`, `style`. Height 50, radius full.
- **`TextField`** — label + pill input; props: `label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType, error, prefix` (prefix = left adornment like `@`).
- **`Avatar`** — `fullName`, `imageUrl`, `size`. Initials fallback on primarySoft.
- **`UsernameField`** — username input with availability checking (debounced `isUsernameTaken`).
- **`PhoneInput`** — country-code picker (bottom sheet) + phone input.
- **`ProfilePicture`** — avatar with camera edit affordance (Ionicons).
- Icons: `Ionicons` from `@expo/vector-icons`.

## Layout / navigation
- Custom floating iOS-style tab bar (`components/tab-bar/`): capsule 60 tall, `topMargin 12`, `bottomMargin 6`, `horizontalMargin 14`, icon size 28. Band height = `78 + insets.bottom`, positioned `absolute bottom: 0`. Tabs content has NO bottom padding so it extends behind the bar to the screen edge.
- `Screen` reads `BottomTabBarHeightContext` to detect a tab bar (`hasTabBar`).

## Page patterns (match the Users page grammar)
1. Header: big title (`24/700 text`) + muted subtitle (13).
2. Search: pill `TextInput` (height 48, radius full, `surface` bg, `border` stroke, paddingRight 44) wrapped in a `View` with an absolute right-aligned X clear button (Ionicons `close`, 18, muted) shown only when text exists.
3. Filter chips: horizontal `ScrollView` of pill `Pressable`s; active = `colors.primary` bg + `white` text; inactive = `surface` bg + `border` + muted text.
4. List: `FlatList` of Pressable cards (row: `Avatar 44` + info + right badges), `RefreshControl`, `onEndReached` "Load more", `ListEmptyComponent` (title + subtitle + optional action button).
5. Notice banner: full-pill `48` height, tone styles success (`#dcfce7`/success), danger (`#fee2e2`/danger), role (`primarySoft`/`primaryDark`); auto-dismiss 3s with a cleared `setTimeout` ref.
6. Bottom-sheet Modal: `transparent`, `animationType="slide"`, `statusBarTranslucent` + `navigationBarTranslucent`, absolute backdrop `Pressable` to close, card with `borderTopLeft/RightRadius 28`, drag-handle bar, `paddingBottom: spacing.xl + insets.bottom`; pan-to-dismiss via `PanResponder` (`useSheetDrag` pattern in users.tsx).
7. Copy feedback: pill (`primarySoft` bg, `primaryDark` text, radius full, 12/600) shows "Copy" → swaps to "Copied" for 1.5s (`copyTimeout` ref pattern). Row values are Pressables.
8. Confirm buttons: double-press pattern — first press swaps label to "Confirm … (5)" and starts a 5s countdown (`setInterval` ref); reverts automatically at 0; timer cleared on confirm/cancel/close.

## Keyboard handling rules (hard-won)
- Main `Screen`: KAV on BOTH platforms — `behavior={Platform.OS === "ios" ? "padding" : "height"}` (see Screen above). Android native resize is inert under edge-to-edge (SDK 54), so KAV must handle it — without it the keyboard covers the focused field.
- Bottom-sheet modals: KAV iOS-only (`padding`); on Android add bottom padding to the sheet's scroll content = `keyboardHeight` from `lib/useKeyboardHeight` so the sheet stays glued to the bottom edge.
- Always `Keyboard.dismiss()` before closing a modal that had focus.

## Verification
- After changes: `npx tsc --noEmit` and `npx eslint <file>`. Ignore pre-existing Deno errors only in `supabase/functions/clerk-webhook/index.ts` (no Deno types in this project).

# Clerk ↔ Supabase Integration (hard-won facts — do not re-litigate)

## Credentials / config
- Supabase project ref `mrtactqgmtmfcmocqgmp`, URL `https://mrtactqgmtmfcmocqgmp.supabase.co`.
- Webhook endpoint: `https://mrtactqgmtmfcmocqgmp.supabase.co/functions/v1/clerk-webhook`.
- Secrets (Supabase access token, Clerk webhook signing secret) live in `.env` / session context — do NOT commit raw values into AGENTS.md or code.
- CLI: `npx --yes supabase@latest` (NO Docker — docker-based subcommands fail). Multi-statement/DO-block SQL: write to a temp `.sql` file and run `db query --linked --file <path>` (inline `$$` gets mangled by PowerShell).
- No function log tables and no `logs` subcommand — cannot inspect webhook deliveries from here; ask user to check Clerk Dashboard → Webhooks → Deliveries.
- Svix signature formula (verified): `base64(HMAC(key, "msgId.timestamp.payload"))` where `key = base64.decode(secret.replace(/^whsec_/, ""))`.

## Role + sync model (DB-authoritative)
- Clerk webhook delivery is EVENTUAL — new users can take minutes to appear in Supabase. Not a bug.
- `admin` is NEVER accepted from Clerk metadata — webhook only accepts `customer|barber|owner`. To make someone admin: `update profiles set role='admin' where id='...'` in Supabase. `lib/useReconciledRole()` pushes it into Clerk metadata when DB `updated_at` > metadata `roleUpdatedAt`.
- Webhook maps: phone from `unsafe_metadata.phone` (fallback `phone_numbers`), `profileCompleted`→`onboarding_completed`, `avatar_url = image_url` only if `has_image` else null.
- `@clerk/backend` is PINNED to `3.15.1/webhooks` in the Deno function (3.16.0 broken — depends on canary-only `@clerk/shared`). Do not bump without testing.
- `profiles` has partial unique index `profiles_email_active_unique` on email `WHERE deleted_at IS NULL` → one ACTIVE account per email; deleted rows keep history and don't block email reuse.
- `account_status` generated column: only `'active' | 'deleted'` (deleted when `deleted_at` set). `is_disabled` intentionally NOT shown but column/RPC stays.
- Account deletion = Clerk `user.deleted` → webhook soft-delete (sets `deleted_at`). Hard delete impossible (FKs `ON DELETE RESTRICT` on shops/shop_members/bookings/reviews).
- `onboarding_completed` = mirror of Clerk `profileCompleted` (onboarding progress marker, no security role).

## Migrations (applied remotely)
- `20260806000000_initial_schema.sql`, `20260806100000_profiles_account_status.sql`, `20260806110000_email_active_unique.sql`.
- Apply with `npx --yes supabase@latest db push --linked`.

## App wiring
- `DeleteAccountButton` (under Sign Out in AccountScreen): confirm Alert → `user.delete()` → `router.replace('/welcome')`. Requires Clerk Dashboard "User deletion" instance setting ENABLED or `user.delete()` throws.
- Admin tabs: `dashboard, shops, users, settings`. The admin **Users screen IS BUILT** (`app/admin/(tabs)/users.tsx`, uses `account_status`) — it is NOT a placeholder anymore.

## Relevant files
- `supabase/functions/clerk-webhook/index.ts` (pinned 3.15.1, admin-excluded, soft-delete), `deno.json`, `.env.example`
- `lib/role-sync.ts` (`useReconciledRole`), `lib/auth.tsx` (`RoleGuard`), `lib/roles.ts` (`SELF_SELECTABLE_ROLES`, `ROLE_ROUTES`), `lib/metadata.ts` (unsafe_metadata shape), `lib/supabase.ts`
- `components/ui/DeleteAccountButton.tsx`, `AccountScreen.tsx`, `SignOutButton.tsx`, `ProfilePicture.tsx`
- `app/(auth)/complete-profile.tsx`, `choose-role.tsx`; `app/admin/(tabs)/users.tsx`
- `docs/er-diagram.md`, `docs/clerk-supabase-audit.md`

# Shop Loyalty System (hard-won facts — do not re-litigate)

## Model
- One program per shop (`loyalty_programs`, `shop_id` unique). Milestones = `loyalty_milestones` ladder (unique `(loyalty_program_id, visit_count)`).
- `customer_loyalty` is the per-customer-per-shop card (`total_completed_visits`, `current_streak`, `best_streak`). Counters CHECK `>= 0`; `best_streak`/`total_completed_visits` never decrease.
- `loyalty_visits` = per-booking award, `booking_id` UNIQUE → idempotent (double FINISH CUT cannot double-count). `increment_streak` records streak math at award time.
- `customer_rewards` per `(customer_loyalty_id, milestone_id)` UNIQUE → each milestone can only be redeemed once. Status: `unlocked → redeemed → expired`.
- **Visits count even when the program is disabled** — `enabled` only gates milestone unlocks, reconciliation, redemption, and customer UI. Streak breakers: `no_show`, or customer-initiated cancel < 24h before `starts_at`.

## Backend rules (business logic lives in the DB, never client)
- `award_loyalty_visit` trigger (on booking → completed) + `reconcile_customer_loyalty` RPC compute visits/streak/rewards. Idempotent on re-run.
- Rewards unlock via reconcile → insert `notifications` row `type='loyalty_reward_unlocked'`. Deleting a milestone cascades its rewards.
- Redemption (`redeem_reward`) only against an upcoming `pending|confirmed` booking at the same shop, only while program `enabled`; sets `redeemed_at` + `redeemed_booking_id` (FK `SET NULL` on booking delete) and snapshots the reward onto `bookings.applied_reward_type/title/value` so barbers can see it (they can't read `customer_rewards` — RLS is owner/manager/admin). BookingCard + barber work-session show an "… applied" badge.
- All writes via SECURITY DEFINER RPCs granted to `authenticated`: `award_loyalty_visit` (trigger), `reconcile_customer_loyalty`, `set_loyalty_program`, `save_loyalty_milestone`, `delete_loyalty_milestone`, `redeem_reward`. Owner/manager/admin for program+milestones; reward owner + enabled program for redemption. Tables are SELECT-only under RLS.
- Reward types: `percentage_discount | fixed_discount | free_service | custom`; value CHECKs — percentage 1–100, fixed/free 0 or null, custom 0–100000. `custom` requires a reward_title/description the owner displays (no built-in redemption).

## Frontend
- `lib/loyalty.ts` — types, SELECT constants, loaders (`loadShopLoyalty`, `loadCustomerLoyalty`) and RPC wrappers (`setLoyaltyProgram`, `saveLoyaltyMilestone`, `deleteLoyaltyMilestone`, `redeemReward`).
- `components/ui/ShopLoyaltyCard.tsx` — customer card (stats, progress, milestone ladder, redeem buttons; BottomSheet picker when >1 upcoming booking). Integrated in `app/customer/shop/[id].tsx` (after Barbers), guarded by `!!user?.id`.
- `components/ui/OwnerLoyaltySection.tsx` — owner/manager Switch + milestone edit/delete (double-press `useConfirmAction`) + MilestoneSheet add/edit. Integrated in `app/owner/(tabs)/shop.tsx` after the Save hours button.
- `TextField.keyboardType` only accepts `"numeric" | "phone-pad" | "default" | "email-address"`; `Button` has no `size` prop.

## Seed / verify
- `supabase/seed.sql` truncates loyalty tables and seeds shop 1: program enabled, milestones 3→10% off / 5→Free haircut / 10→20% off, plus 2 extra completed zkrmznbeta bookings (3 visits, 10% off unlocked). `zkrmznbeta@gmail.com` has multiple profile rows — resolve the active one via `deleted_at is null` (`user_3Hg4ilkuLJiIVhvoQOLpKBDYoCC`).
- Regression suite: `C:\Users\zakar\AppData\Local\Temp\opencode\loyalty_tests.sql` (in-transaction, rolls back). CLI `db query` only prints the last result set.
- Migration: `supabase/migrations/20260811140000_shop_loyalty.sql`, `20260811150000_booking_applied_reward.sql` (booking reward snapshot), `20260811160000_backfill_booking_applied_reward.sql` (applied remotely). Full ER: `docs/er-diagram.md`.

# DATABASE-FIRST DEVELOPMENT RULES

IMPORTANT: READ THIS BEFORE IMPLEMENTING ANY NEW FEATURE

Supabase is the source of truth. Do NOT build frontend-only/mock systems for persistent application data.

Authorized to: inspect the database, create/alter tables, add/remove columns, create indexes, FKs, constraints, database functions, triggers, RPCs, migrations, RLS policies, remove obsolete structures when safe, create seed/test data. MUST be extremely careful not to break existing CutBook functionality.

## 1. Database first
Before writing frontend code for any feature: inspect the current Supabase schema; identify existing tables, relationships, enums/statuses, functions/RPCs, triggers, RLS policies, indexes/constraints, and where the source of truth lives. Do not assume the database is empty — it contains important production logic. Reuse existing structures instead of duplicating.

## 2. Do not create duplicate systems
Before creating a new table/column/function/status: SEARCH the existing database. If something already exists (booking completion, customer info, etc.), extend it when appropriate.

## 3. Database must be the source of truth
Anything that must survive app restart, logout/login, device change, reinstall, or access by another user/device MUST be stored in Supabase. Never store persistent business data only in React state, Context, AsyncStorage, local variables, mock arrays, or hard-coded constants. Local state is for UI state only.

## 4. Every new data model must be related
Every new entity must have proper relationships (Customer → Booking → Barber → Shop). No isolated tables with duplicated user/shop IDs. Use proper FKs, unique constraints, indexes, nullable rules, cascading behavior where appropriate. Make relationships explicit.

## 5. Authentication vs database user
Respect the existing Clerk + Supabase architecture. Do NOT create another auth system. Reference users via the existing CutBook user/profile relationship. Ensure customer/barber/owner/admin map to the correct database user.

## 6. Enums and status values
Before creating a new enum/status, check whether one already exists. Don't create `booking_status_v2`/`booking_state_new` when the existing system needs a small extension. Maintain one authoritative state model; extend it carefully.

## 7. Business logic belongs in the backend
Important rules (booking completion, loyalty visit calculation, customer reputation, reward unlocking/redemption, cancellation penalties, no-show handling, shop membership, invitation codes, permissions) must NOT exist only in React Native. The backend enforces; the frontend requests and displays. Never trust the client to enforce critical business rules.

## 8. Atomic operations
When one user action modifies multiple data points, prefer a transaction-safe backend operation (e.g., booking COMPLETED may update status, record completion, update customer stats, loyalty, unlock reward — must not partially succeed) unless the architecture intentionally handles async processing.

## 9. Idempotency
Critical operations must be safe if executed twice (e.g., barber presses FINISH CUT twice → no +2 loyalty visits). Use unique constraints, event records, status checks, database functions, transaction logic where necessary.

## 10. RLS is mandatory
Every new table must have appropriate RLS. Before adding a table determine per role (customer/barber/owner/admin): what they can read, create, update, and never modify. Then implement the policies.

## 11. Never trust client-supplied business values
Do NOT allow the client to directly control reputation level/score, loyalty visit count/streak, reward status/ownership, booking completion, shop ownership, barber membership, verification state, or admin privileges. The client requests an action; the backend decides validity.

## 12. Audit important changes
Consider preserving who/when/what/why for important operations (admin overrides, reputation changes, reward redemption, booking state changes, shop membership, invitation codes). Use the simplest robust solution; don't over-engineer.

## 13. Database migrations
Every database modification MUST go through a proper migration — no undocumented manual changes. Files must be clear, ordered, reproducible, safe, understandable, with descriptive names (e.g., `20260804_add_customer_reputation.sql`, not `fix.sql`).

## 14. Safe migrations
Before changing an existing table, understand existing data, FKs, RLS, app queries, RPCs, triggers. Do not blindly DROP TABLE/COLUMN/TYPE unless verified nothing depends on it. If something is obsolete, explain why it's safe to remove.

## 15. Data integrity
Use database constraints (NOT NULL, UNIQUE, CHECK, FK, indexes, valid ranges, valid states). Don't rely exclusively on frontend validation (e.g., the DB must prevent negative loyalty counts, not just the UI).

## 16. Performance
Add indexes for commonly queried fields (customer_id, shop_id, barber_id, booking_id, status, created_at, scheduled_at) on tables that will grow — based on actual queries, not randomly.

## 17. Data consistency
If info can be derived from another source, avoid duplication. If denormalized counters are required for performance, ensure the backend updates them consistently.

## 18. Existing data
Before schema changes, inspect existing records. Provide a safe migration/backfill strategy for existing users (e.g., sensible initial reputation state; consider existing completed bookings for loyalty per the spec). Do not silently lose historical data.

## 19. Frontend must match the database
After implementing the database, update the frontend to use the real model. Do NOT create fake arrays/mock data in frontend code as the source of truth.
