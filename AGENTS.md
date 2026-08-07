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
- **`Screen`** — root wrapper for every screen. Props: `scroll`, `centered`, `style`. `SafeAreaView` edges: top-only when inside a tab (content must run behind the floating tab bar to the screen edge), top+bottom otherwise. **Keyboard handling: `KeyboardAvoidingView` is iOS-only (`behavior={Platform.OS === "ios" ? "padding" : undefined}`); on Android rely on native resize. NEVER set KAV behavior on Android — it gets stuck and leaves a white strip.**
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
- Main `Screen`: KAV iOS-only (see above). Never Android.
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
