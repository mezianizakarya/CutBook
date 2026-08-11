# Barber Work Session — Delivery Report

## 1. What already existed

- Booking lifecycle `pending → confirmed → completed / cancelled / no_show` (CHECK constraint on `bookings`). No "in-progress" status.
- RPCs: `set_booking_status` (transition gate), `cancel_booking`, `booking_customer_details`. All writes are RPC-only (no UPDATE/DELETE policies on `bookings`).
- `bookings.starts_at` / `ends_at` (timestamptz), `service_duration_minutes`, service snapshots, no-overlap EXCLUDE constraint on `[starts_at, ends_at)`.
- Shared UI: `Screen`, `Button`, `EmptyState`, `Avatar`, `NoticeBanner`, `SectionHeader`, `BookingCard`, `StaffBookingSheet`, theme tokens.
- `lib/booking.ts` (`BookingRow`, `BOOKING_SELECT`, `customerDisplayName`, `setBookingStatus`), `lib/barber.ts` (`loadMyMemberships`, `loadMyBookings`), `lib/format.ts`, `useNotice`.

## 2. What was added

**Database (migration `20260809150000_barber_work_session.sql`, applied):**
- `bookings.started_at timestamptz` — authoritative "started serving" timestamp.
- `bookings.extended_minutes integer NOT NULL DEFAULT 0` (CHECK >= 0) — persisted extra minutes.
- RPC `start_booking(p_booking_id)` — sets `started_at`, promotes `pending → confirmed`, reuses the staff/lead/admin authorization pattern of `set_booking_status`.
- RPC `extend_booking(p_booking_id, p_minutes)` — adds minutes to the served booking, same auth pattern.
- Both `SECURITY DEFINER`, `set search_path=''`, revoked from `public`, granted to `authenticated`.

**Client:**
- `lib/booking.ts` — `BookingRow` + `BOOKING_SELECT` now carry `started_at` / `extended_minutes`.
- `lib/workSession.ts` (new) — single source of truth for the day's schedule:
  - `buildTodaySchedule` — sorts today's bookings, walks a clock so each expected start = `max(scheduled, previous expected end)`; delay accumulates across the day. Cancelled/no-show excluded; completed bookings advance the clock. Extending the active booking shifts every later booking automatically (accumulated delay, never "add N min to each row").
  - `effectiveEndMs` — `started_at + duration + extended_minutes` (never mutates `ends_at`, so the EXCLUDE constraint is untouched).
  - `activeEntry` / `nextEntry` (returns the first bookable entry AFTER the currently served one, so a skipped past booking can't become "NEXT UP") / `currentPosition` / `totalDelayMs` / `remainingMs`.
  - `formatCountdown` (`MM:SS` / `H:MM:SS`), `formatDelay` ("7 min" / "1h 5m"), RPC wrappers `startBooking` / `extendBooking`, and `useNow` (1s tick; timer is always derived from DB timestamps — survives reload/multi-device). The schedule memo depends on the day key, not each tick.
- `app/barber/work-session.tsx` (new) — Work Session screen: header (date + "Appointment 1 of 6"), "Running X min behind schedule" delay pill, NOW SERVING card (countdown timer with 3-min warning / "Time is up" / "Overtime" states, +1/+2/+5 add-time, Finish Cut), NEXT UP card (estimated start when delayed, Start Next Appointment, Customer didn't arrive), or "all completed" empty state; scrollable today's queue below. Actions reuse `setBookingStatus` for finish/no-show. Reloads on focus, pull-to-refresh, and AppState → active; back button falls back to the dashboard when there is no history.
- `app/barber/(tabs)/dashboard.tsx` — Today's schedule section now shows an appointment count + "Start Workday" / "Continue Work Session" button (route `/barber/work-session`); the next-up time uses the estimated (delay-adjusted) start; the section is an `EmptyState` whenever there is nothing actionable today (including days where every booking was cancelled).
- `supabase/migrations/20260809160000_allow_pending_no_show.sql` — redefines `set_booking_status` to also allow `pending -> no_show` (additive; all existing transitions unchanged) so "Customer didn't arrive" works for bookings that were never confirmed.

## 3. Can the DB support it safely?

Yes. No new statuses or tables were needed. Expected end is **derived** (`started_at + duration + extended_minutes`) and never written into `ends_at`, so the `bookings_no_overlap` EXCLUDE constraint remains valid even when a booking is extended. Authorization is identical to the existing booking RPCs. All transitions still flow through RPCs (RLS intact).

## 4. Files changed / created

- `supabase/migrations/20260809150000_barber_work_session.sql` (new, applied)
- `supabase/migrations/20260809160000_allow_pending_no_show.sql` (new, applied)
- `supabase/migrations/20260810120000_work_session_upgrades.sql` (new, applied — see §6)
- `lib/booking.ts` (edited)
- `lib/workSession.ts` (new)
- `app/barber/work-session.tsx` (new)
- `app/barber/(tabs)/dashboard.tsx` (edited)
- `lib/barber.ts` (edited — `loadBarberClients`)
- `app/customer/(tabs)/bookings.tsx` (edited — live progress)

## 5. What didn't work / notes

- `supabase db push` printed a Docker warning when caching the local migration catalog; the push itself succeeded (verified columns + functions in the linked DB). Docker is not available in this environment — only the catalog cache step needs it.
- `set_booking_status` (finish/no-show) returns the row without the `shop`/`staff` embeds, so the work session refetches via `load()` after every action instead of merging partial rows.
- Supabase CLI auth intermittently fails with `FATAL: password authentication failed for user "cli_login_postgres..."` — a plain retry succeeds. Multi-statement `db query --file` files only surface the last result set.

## 6. Work Session v2 (migration `20260810120000_work_session_upgrades.sql`)

**Database:**
- `bookings.paused_at timestamptz` + `bookings.paused_minutes integer NOT NULL DEFAULT 0` — pause bookkeeping; expected end stays derived (`effectiveEndMs = started_at + duration + extended_minutes + paused_minutes + (now - paused_at) when paused`). `ends_at` is never touched, so the no-overlap EXCLUDE constraint is unaffected.
- RPC `pause_booking(p_booking_id)` / `resume_booking(p_booking_id)` — toggles the pause fields on the served booking, same staff/lead/admin auth pattern as `set_booking_status`; `SECURITY DEFINER`, `search_path=''`, revoked from `public`, granted to `authenticated`.
- `work_days` table (`staff_id`, `day` date, `started_at`, `ended_at`, RLS per staff) + RPCs `start_workday(p_staff_id, p_started_at)` / `end_workday(p_staff_id, p_ended_at)` — keeps one open day per staff via partial unique index.
- RPC `add_walkin(p_staff_id, p_service_id, p_customer_id, p_starts_at)` — creates a `confirmed` booking for today with service snapshot, overlaps → friendly error, same auth pattern.
- RPC `staff_day_schedule(p_booking_id)` — non-PII schedule rows for a customer's staff day, so the customer screen can show "you're being served" / "up next".

**Client:**
- `lib/workSession.ts` — pause-aware `effectiveEndMs` / `isPaused`; wrappers `pauseBooking` / `resumeBooking` / `addWalkIn` / `loadWorkday` / `startWorkday` / `endWorkday`; `summarizeDay` (served / no-shows / revenue / delay, counted from raw bookings so no-shows aren't filtered out); `staffDaySchedule`; `customerProgress` (serving / up next / running late).
- `lib/barber.ts` — `loadBarberClients` (90-day booking window, `groupClients`) for the walk-in customer picker.
- `app/barber/work-session.tsx` — realtime subscription on `bookings` (`staff_id=in.(...)`), midnight day-key auto-reload, AppState → active reload, haptics on next-appointment arrival + timer-zero, Take a break / Resume (with paused countdown), double-press confirm Start (+ Start Early guard within 5 min), End Day confirm countdown + day-summary card (auto-`startWorkday` when actionable work exists), Add walk-in bottom sheet (service chips, client chips, start offsets Now / +15 / +30 / +45), today's queue. Walk-in / End Day / summary buttons live above the flex:1 queue so they stay visible.
- `app/customer/(tabs)/bookings.tsx` — `BookingDetailSheet` fetches the staff day and renders a live progress card ("being served now" with countdown / "up next" / "running a bit late" / checking).

Verified: `npx tsc --noEmit` clean except pre-existing Deno errors in `supabase/functions/clerk-webhook/index.ts`; `npx eslint` clean on all changed files. DB columns, `work_days` table, and all 6 new RPCs verified against the linked project; RPCs confirmed to execute (raise "not authenticated" for the CLI role, as expected).

## 7. Work Session — production polish (migration `20260810150000_booking_completed_at.sql`)

**What the audit found (PHASE 1):** the existing implementation already satisfied most of the production brief — derived states, one authoritative timing source, RPC-only writes, realtime, workday model. The gaps were: no recorded finish timestamp, no header overflow menu, Finish Cut not primary/sticky, no OVERTIME treatment, "Running long?" copy, no scheduled-vs-estimated queue labels, no finish confirmation, and customer-side live updates only via one-shot fetch.

**Database (migration `20260810150000_booking_completed_at.sql`, applied & verified):**
- `bookings.completed_at timestamptz` (nullable) + partial index `(staff_id, completed_at)`.
- `set_booking_status` now sets `completed_at = now()` on `completed` and nulls it on any other transition. Same auth checks and transition matrix as before; RLS untouched. Actual duration = `completed_at - started_at` (early finish supported — the timer is never required to reach zero).

**Client:**
- `lib/booking.ts` — `BookingRow` + `BOOKING_SELECT` carry `completed_at`.
- `lib/workSession.ts` — `deriveBookingPhase` (single source mapping a row → completed/cancelled/no_show/current/overtime/next/scheduled), `actualDurationMs`, `remainingAppointments`.
- `app/barber/work-session.tsx` — "Today's Work" header with back / title / `•••` overflow menu (Take a break ⇄ Resume, Today's schedule → `/barber/schedule`, End workday). NOW SERVING card: avatar, service `duration · price`, scheduled time, customer note, large countdown with "remaining" / "Almost done" / "On break" captions, OVERTIME state (`+MM:SS` + "The appointment is running long."), "Ends at …", "Need more time?" +1/+2/+5. Sticky bottom `FINISH CUT` bar (always visible while serving). Finish uses a lightweight confirm sheet (`Finish appointment? [Cancel][Finish Cut]`). After finishing: "✓ Appointment completed" pill + NEXT CUSTOMER card with estimated start + `START APPOINTMENT` (explicit, never auto-started) + "Customer didn't arrive". Queue rows show ✓ completed / ● NOW / ○ upcoming with `~` estimated times, strikethrough scheduled time, and an "Estimated" label; delay pill above. No large End Day button — End workday lives in the overflow menu with a confirm sheet ("You still have X appointments remaining today." `[Cancel][End Workday]`).
- `app/customer/(tabs)/bookings.tsx` — `BookingDetailSheet` now subscribes to realtime on its own booking (`id=eq.<id>`) and gently polls `staff_day_schedule` every 20s while open (RLS hides other customers' rows, so the poll carries queue/delay changes); `onRowUpdate` patches the sheet row + list when the booking's status changes (e.g. barber completes it).

**Test data (PHASE 7):** `supabase/seed.sql` section 15 recreates the dev barber's today queue idempotently (early-finish completed booking with `completed_at`, an in-progress booking with +5 min extension, an upcoming confirmed, one pending). Applied live to the linked DB — member 54 now shows bookings 176/177/178/179 in those states.

**Verification (PHASE 8):** `npx tsc --noEmit` clean except the pre-existing Deno errors in `supabase/functions/clerk-webhook/index.ts`; `npx eslint` clean on `app/barber/work-session.tsx`, `app/customer/(tabs)/bookings.tsx`, `lib/booking.ts`, `lib/workSession.ts`. `completed_at` column and `set_booking_status` EXECUTE grant confirmed in the linked DB via `db query --file`.

**Full design rationale:** see `docs/work-session-v2-architecture.md` (state model, timing model, queue algorithm, sync strategy, developer guide, test data).
