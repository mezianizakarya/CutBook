# Work Session v2 — Architecture Decisions

Status: PHASE 2 · Applies to `app/barber/work-session.tsx` + `lib/workSession.ts` + `lib/booking.ts` + `app/customer/(tabs)/bookings.tsx`.

## 1. Audit summary (PHASE 1)

The existing implementation is a solid foundation and already satisfies most of the
brief. Verified live and in migrations:

- `bookings` state machine is `pending → confirmed → completed | cancelled | no_show`
  (TEXT + CHECK, not an enum). In-progress / overtime / next are DERIVED from
  `started_at`; there is no "in_progress" status and we will not add one.
- `start_booking`, `extend_booking`, `pause_booking`, `resume_booking` already exist
  (20260809150000 + 20260810120000) and mutate only derived fields
  (`started_at`, `extended_minutes`, `paused_at`, `paused_minutes`). `ends_at` is
  NEVER mutated, so the no-overlap EXCLUDE constraint stays intact.
- `work_days` + `start_workday` / `end_workday` (idempotent clock in/out) exist.
- `staff_day_schedule(booking_id)` exists for customer-side progress.
- Bookings RLS is select-only (customer / staff / owner-manager / admin) plus
  insert-pending for customers. State changes are enforced exclusively by the
  SECURITY DEFINER RPCs, which re-check staff/lead/admin membership. No weakening.
- Realtime publication includes `bookings` and `notifications`. Barbers already
  subscribe with `staff_id=in.(active memberships)`.
- Missing for the brief: an actual **finish timestamp** (`completed_at`), and the
  UI polish items in §3.

## 2. State model (single authoritative mapping)

No new statuses. Everything is derived from a `BookingRow` + `now`:

| UI state        | Derived from                                        |
| --------------- | --------------------------------------------------- |
| completed       | `status = 'completed'`                              |
| cancelled       | `status = 'cancelled'`                              |
| no_show         | `status = 'no_show'`                                |
| current         | `status = 'confirmed'` AND `started_at` not null    |
| overtime        | `current` AND `effectiveEndMs(row, now) < now`      |
| next            | first upcoming `confirmed` with `started_at` null   |
| scheduled       | any upcoming `confirmed` after the next one         |

The helper `deriveBookingPhase(row, now)` in `lib/workSession.ts` is the ONLY place
that maps rows → phases. UI and queue rendering consume it; nothing computes these
inline in components.

## 3. Timing model (single source of truth)

One authoritative function: `effectiveEndMs(row, now)`.

```
expectedEnd =
  started_at
  + service_duration_minutes
  + extended_minutes
  + paused_minutes
  + (now - paused_at) when paused     // time spent paused since last resume
```

- Remaining = `expectedEnd - now` (can go negative → overtime).
- `ends_at` (scheduled) is preserved as the ORIGINAL scheduled time and is only used
  to show "Ends at [original]" / queue scheduled times.
- The client ticks with `useNow` (a lightweight 1s interval). Only timer displays
  re-render on the tick; the queue and card structure re-render only when data
  changes. No per-second full-screen re-render.
- Countdown is derived from DB timestamps, never from a client-side interval
  accumulated at start (safe across backgrounding / AppState / network).

## 4. Queue algorithm

`buildTodaySchedule(bookings, now)` (already in `lib/workSession.ts`) is the single
authoritative algorithm, shared by dashboard and work-session.

- Sorts by scheduled `starts_at`; skips `cancelled`.
- Estimates each upcoming slot's start = previous slot's estimated end (cascading
  from `effectiveEndMs` of the current/first slot). Estimated times are labeled
  `~`/`Estimated` in the UI; scheduled times come from `starts_at`.
- Queue delay indicator = `now - expectedEndOfCurrent` → "Running X min behind".

## 5. Database change (PHASE 3 — minimal, additive)

- Add `bookings.completed_at timestamptz` (nullable). Index on `(staff_id, completed_at)`.
- Extend `set_booking_status`: when `p_status = 'completed'` set
  `completed_at = now()`; otherwise null it out. Reversible; does not touch the
  transition matrix or RLS.
- Actual duration = `completed_at - started_at` (computed at finish time and shown
  in the finish sheet + stored on the booking). No separate audit table — the row
  itself is the history (existing design).

## 6. UI architecture

Keep the single-screen structure (matches existing codebase style — no new component
layer for a one-screen flow). Extract only stable pieces:

- `lib/workSession.ts` — all business logic (phases, timing, queue, RPC wrappers).
- `app/barber/work-session.tsx` — composition. Sections:
  1. Header: back chevron · "Today's Work" title + "Today · Appointment X of Y" ·
     `•••` overflow icon.
  2. Overflow bottom sheet: Take a break (pause/resume) · Today's schedule
     (`router.push('/barber/schedule')`) · End workday (confirm w/ remaining count).
  3. Current appointment card (NOW SERVING): avatar, name, service,
     `duration · price`, scheduled time, large countdown + "remaining", "Ends at …",
     "Need more time?" `[+1][+2][+5]`, `FINISH CUT` (primary). Overtime state:
     "OVERTIME +MM:SS" + "The appointment is running long."
  4. Sticky bottom action bar when a current appointment exists: `FINISH CUT`.
  5. Next-customer card after finishing: "✓ Appointment completed" +
     "NEXT CUSTOMER" + estimated time + `[START APPOINTMENT]` (explicit, no auto-start).
  6. Queue section: rows COMPLETED ✓ / CURRENT ● NOW / UPCOMING ○ with estimated
     `~` times; "Running X min behind" pill.
  7. Empty/loading/error states (No appointments today / workday not started /
     you're done for today / no appointment in progress / next appointment).

## 7. Customer sync (PHASE 6)

- Real-time: subscribe to `bookings` `id=eq.<bookingId>` for the sheet currently open
  (customer sees their own row). RLS prevents seeing other customers' rows, so a
  gentle ~20s poll of `staff_day_schedule` is added while the sheet is open to pick
  up queue-position / delay changes.
- DB remains the source of truth; no new notification mechanism for this feature.

## 8. Explicit non-goals (from the brief)

- No auto-start of the next appointment.
- No large destructive End Day button at the bottom of the screen (moved to overflow).
- No local timers as the source of truth.
- No overwriting original scheduled times (`ends_at` untouched).
- No second design system / status enum / realtime channel / audit table.
- No weakening of RLS or bypassing the RPC transition matrix.

## 9. Developer guide

- **Security / RLS**: untouched. Bookings remain select-only (customer / staff /
  owner-manager / admin) + insert-pending for customers. All transitions go
  through the SECURITY DEFINER RPCs (`set_booking_status`, `start_booking`,
  `extend_booking`, `pause_booking`, `resume_booking`, `start_workday`,
  `end_workday`, `add_walkin`), which re-check staff/lead/admin membership. Never
  write `bookings` directly from the client.
- **Offline / network safety**: timers are derived from DB timestamps each tick
  (`effectiveEndMs` + `useNow`), never from a client-accumulated interval, so a
  backgrounded app or flaky network cannot drift the countdown. Every action
  re-fetches authoritative state via `load()` after the RPC; duplicate-action
  guards (`busy`, disabled buttons, confirm sheets) prevent double-taps.
- **Error states**: `errorMessageFromUnknown` surfaces human-readable messages;
  the screen shows a centered error line and keeps the queue interactive. The
  finish/end-day sheets report failures via the notice banner, not silent drops.
- **Empty states**: "No appointments today" (nothing scheduled), "All
  appointments completed" / "You're done for today" (everything served), and the
  queue simply lists what remains. Loading = centered spinner while `bookings`
  is still `null`.
- **Accessibility**: every interactive element is a `Pressable`/`Button` with
  `accessibilityRole="button"`; the overflow icon has an accessibility label;
  the countdown uses tabular numerals and a large (56pt) weight-800 font; all
  touch targets are ≥ 40pt with `hitSlop`.
- **Performance**: `useNow` ticks every second but only the timer text re-reads
  it; the schedule/card structure re-renders only when `bookings` changes
  (`buildTodaySchedule` is memoized on `[bookings, now]` — the per-second `now`
  recomputes a small array, which is cheap and needed to keep estimates live).
  Realtime events re-fetch the day once; nothing polls per-second. The customer
  sheet polls `staff_day_schedule` at most every 20s.
- **Verification**: `npx tsc --noEmit` (ignore pre-existing Deno errors in
  `supabase/functions/clerk-webhook/index.ts`) and `npx eslint <file>` on every
  changed file. DB changes go through `npx --yes supabase@latest db push
  --linked` (no Docker) and are confirmed with `db query --linked --file`.

## 10. Test data (PHASE 7)

`supabase/seed.sql` section 15 recreates the dev barber's (member 54) today's
queue — idempotent, and a no-op where that profile is absent. It demos every
state: an early-finish completed booking (30 min booked, `completed_at` 20 min
after `started_at`), an in-progress booking started 22 min ago with a +5 min
extension (running countdown), an upcoming confirmed appointment, and one still
pending. Apply standalone (without wiping the rest of the seed):

```
npx --yes supabase@latest db query --linked --file supabase/seed.sql
```

or run only section 15. No work_days row is seeded: the screen auto-opens the
workday on first load when there is work.

