# CODEBASE_GUIDE

Shared UI patterns and hooks every screen/component should use. See `AGENTS.md` for the full design system, Clerk/Supabase integration, and verification workflow.

## Shared hooks (`lib/`)

### `useNotice(duration = 3000)`
Toast/notice state with auto-dismiss. Returns `{ notice, showNotice }`.

- `notice`: `{ message, tone } | null` — `tone` is `"danger" | "success" | "role"`.
- `showNotice(message, tone = "success")` — shows a notice and auto-dismisses after `duration` (clears any pending timer first).
- Render it with `NoticeBanner`. Replaces the old inline `noticeTimeout`/`setTimeout` ref pattern on every screen.

Usage:
```tsx
const { notice, showNotice } = useNotice();
// showNotice("Saved", "success"); showNotice("Failed", "danger");
return <NoticeBanner notice={notice} />;
```

### `useConfirmCountdown({ onExpire?, seconds = 5 })`
Double-press confirm countdown. Returns `{ count, start, cancel }`.

- `start()` — resets to `seconds` and begins the 1s interval; calls `onExpire` when it reaches 0 (and resets `count` back to `seconds`).
- `cancel()` — stops the interval immediately.
- Timer is auto-cleared on unmount.
- Replaces the old inline `countdownRef`/`countRef`/`setConfirmCount`/`startCountdown`/`cancelCountdown` blocks (SignOutButton, DeleteAccountButton, StaffBookingSheet, ShopAdminSheet, admin users ActionModal, customer bookings detail sheet, barber dashboard leave).

Usage:
```tsx
const [confirming, setConfirming] = useState(false);
const { count, start, cancel } = useConfirmCountdown({ onExpire: () => setConfirming(false) });
// Button title: confirming ? `Confirm (${count})` : "Confirm"
```

### `useSheetDrag(onClose)`
Bottom-sheet pan-to-dismiss. Returns `{ translateY, panResponder }`. Attach `panResponder.panHandlers` to the drag-handle area and `translateY` to the card transform. Already used by `BottomSheet`, `StaffBookingSheet`, and the custom sheets in admin users, customer bookings/discover, and barber clients.

## Shared components (`components/ui/`)

### `NoticeBanner`
Props: `notice: Notice | null`, `variant?: "bordered" | "soft"`, `style?`.
- `"bordered"` — full-pill 48 high with `borderWidth` (admin, customer, barber screens).
- `"soft"` — `primarySoft` full-pill (owner screens).
- Renders nothing when `notice` is null.

### `FilterChip`
Props: `label`, `selected`, `onPress`, `style?`.
- Active = `colors.primary` bg + white text; inactive = `surface` bg + `border` + muted text. Replaces local filter-chip definitions that used to live in owner screens.

### `BookingCardRow` (type in `lib/booking.ts`)
The booking list-card row type lives in `lib/booking.ts` (alongside `BookingStatus`, `BookingRow`, `BOOKING_SELECT`, `toBookingCard`, `isCancellable`, `customerDisplayName`, `cancelBooking`, `setBookingStatus`, `fetchBookingCustomers`). Import the type from `@/lib/booking`, not from `BookingCard.tsx`.

Helpers for screens:
- `buildCustomerByIdMap(rows)` — map `customer_id` → `BookingCustomer`.
- `patchBookingRow(current, updated)` — merge an updated row back into the local list state.

## Owner shop screen structure (`app/owner/(tabs)/shop.tsx`)
- **Services** and **Working hours** render as compact grouped cards (hairline dividers, `paddingVertical: sm+2`, `paddingHorizontal: md`). Services show `name` + `$price · duration min` (no category on the row) with a Switch (owner) or Active/Hidden pill (manager) on the right. The summary's "Edit" action pushes to a dedicated management screen.
- **`app/owner/shop-services.tsx`** (pushed via `router.push("/owner/shop-services", { shopId })`) — full service management: add/edit via the `ServiceSheet` bottom sheet (name, price, duration, optional category/description), active toggle. Editing is owner-only in the UI (matches the summary's `canEdit`), managers see read-only Active/Hidden pills.
- **Working hours** on the shop page is a read-only summary (day + `formatOpenRange` / "Closed", today highlighted). Editing lives in a dedicated screen:
- **`app/owner/shop-hours.tsx`** (pushed via `router.push("/owner/shop-hours", { shopId })`) — per-day open/closed Switch + tappable time pills opening the native picker (`@react-native-community/datetimepicker`; iOS spinner bottom-sheet Modal, Android inline dialog); close > open validation; "Apply to multiple days" `BottomSheet` (FilterChip source single-select + target multi-select + preview); save runs a booking-conflict check via `loadUpcomingBookings` (14-day horizon, pending/confirmed) — conflicts surface in a danger card and require an explicit "Save anyway (n)" press.
- Booking availability stays fully inline in `components/ui/BookingModal.tsx` (reads `working_hours`, generates 30-min slots). The editor never changes bookings — it only warns.

## Wiring conventions
- Import order: react/external → `@/components` → `@/lib` (theme, hooks, domain).
- `lib/format.ts` exports `greetingFor(date)` for time-of-day greetings ("Good morning/afternoon/evening"); call it with `new Date()` and append the user's name.
- Every screen with a dismissible toast uses `useNotice` + `NoticeBanner`; no screen defines its own notice state/timer.
- Every double-press danger action uses `useConfirmCountdown`; no component defines its own interval ref.
- Verify with `npx tsc --noEmit` (ignore the Deno errors in `supabase/functions/clerk-webhook/index.ts`) and `npx eslint <file>`.
