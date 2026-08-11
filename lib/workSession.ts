import { useEffect, useState } from "react";

import { BOOKING_SELECT, type BookingRow } from "@/lib/booking";
import { runList, runQuery } from "@/lib/db";
import { startOfDay, toDateKey } from "@/lib/format";
import { supabase } from "@/lib/supabase";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export type ScheduleEntry = {
  row: BookingRow;
  originalStartMs: number;
  originalEndMs: number;
  expectedStartMs: number;
  expectedEndMs: number;
  delayMs: number;
};

/** Booking that still needs to be served or is being served. */
export function isActionable(row: BookingRow): boolean {
  return row.status === "pending" || row.status === "confirmed";
}

export type BookingPhase =
  | "completed"
  | "cancelled"
  | "no_show"
  | "current"
  | "overtime"
  | "next"
  | "scheduled";

/**
 * Single authoritative mapping from a booking to its UI phase. Only this
 * function decides current/overtime/next — components consume phases, never
 * recompute them.
 */
export function deriveBookingPhase(row: BookingRow, now = new Date()): BookingPhase {
  if (row.status === "completed") {
    return "completed";
  }
  if (row.status === "cancelled") {
    return "cancelled";
  }
  if (row.status === "no_show") {
    return "no_show";
  }
  if (row.started_at) {
    return effectiveEndMs(row, now) < now.getTime() ? "overtime" : "current";
  }
  return "next";
}

/** Actual service duration from the finish timestamp (started_at -> completed_at). */
export function actualDurationMs(row: BookingRow): number | null {
  if (!row.started_at || !row.completed_at) {
    return null;
  }
  return Math.max(0, new Date(row.completed_at).getTime() - new Date(row.started_at).getTime());
}

/**
 * Authoritative end of service: started_at + duration + extensions + paused
 * minutes when the barber started the booking, otherwise the scheduled ends_at.
 * While paused, `now` pushes the end forward so the countdown freezes instead
 * of draining.
 */
export function effectiveEndMs(row: BookingRow, now = new Date()): number {
  if (row.started_at) {
    let end =
      new Date(row.started_at).getTime() +
      (row.service_duration_minutes || 0) * MINUTE_MS +
      (row.extended_minutes || 0) * MINUTE_MS +
      (row.paused_minutes || 0) * MINUTE_MS;
    if (row.paused_at) {
      end += now.getTime() - new Date(row.paused_at).getTime();
    }
    return end;
  }
  return row.ends_at
    ? new Date(row.ends_at).getTime()
    : new Date(row.starts_at).getTime();
}

/** True while the barber has paused the served booking. */
export function isPaused(row: BookingRow): boolean {
  return !!row.paused_at;
}

/**
 * Today's serving timeline. Completed bookings advance a clock; the next
 * appointment's expected start = max(scheduled, clock), which accumulates
 * delay across the day. Cancelled/no-show bookings are excluded entirely.
 */
export function buildTodaySchedule(
  rows: BookingRow[],
  now = new Date()
): ScheduleEntry[] {
  const dayStart = startOfDay(now).getTime();
  const dayEnd = dayStart + DAY_MS;

  const today = rows
    .filter((row) => {
      const start = new Date(row.starts_at).getTime();
      return start >= dayStart && start < dayEnd;
    })
    .filter((row) => row.status !== "cancelled" && row.status !== "no_show")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  let clock = -Infinity;
  const entries: ScheduleEntry[] = [];

  for (const row of today) {
    const originalStartMs = new Date(row.starts_at).getTime();
    const originalEndMs = new Date(row.ends_at ?? row.starts_at).getTime();
    const expectedStartMs = Math.max(originalStartMs, clock);

    let expectedEndMs: number;
    if (row.status === "completed") {
      expectedEndMs = originalStartMs + (row.service_duration_minutes || 0) * MINUTE_MS;
      clock = Math.max(clock, effectiveEndMs(row));
    } else if (row.started_at) {
      expectedEndMs = effectiveEndMs(row, now);
      clock = expectedEndMs;
    } else {
      expectedEndMs = expectedStartMs + (row.service_duration_minutes || 0) * MINUTE_MS;
      clock = expectedEndMs;
    }

    entries.push({
      row,
      originalStartMs,
      originalEndMs,
      expectedStartMs,
      expectedEndMs,
      delayMs: Math.max(0, expectedStartMs - originalStartMs),
    });
  }

  return entries;
}

export function activeEntry(entries: ScheduleEntry[]): ScheduleEntry | null {
  return entries.find((entry) => isActionable(entry.row) && entry.row.started_at) ?? null;
}

/**
 * First booking that still needs to be served AFTER the currently served one.
 * Skipping a booking that fell into the past (e.g. never confirmed / not yet
 * marked no-show) must not make it "next" while the barber is already serving
 * a later slot.
 */
export function nextEntry(entries: ScheduleEntry[]): ScheduleEntry | null {
  const active = activeEntry(entries);
  const activeIndex = active ? entries.indexOf(active) : -1;
  return (
    entries.find(
      (entry, index) =>
        index > activeIndex && isActionable(entry.row) && !entry.row.started_at
    ) ?? null
  );
}

/** 1-based position of the booking the barber is on (active, else next). */
export function currentPosition(entries: ScheduleEntry[]): number {
  const active = activeEntry(entries);
  if (active) {
    return entries.indexOf(active) + 1;
  }
  const next = nextEntry(entries);
  if (next) {
    return entries.indexOf(next) + 1;
  }
  return entries.length;
}

/** Accumulated delay: of the next waiting booking, or the active overtime. */
export function totalDelayMs(entries: ScheduleEntry[]): number {
  const next = nextEntry(entries);
  if (next) {
    return next.delayMs;
  }
  const active = activeEntry(entries);
  if (active) {
    return Math.max(0, effectiveEndMs(active.row) - active.originalEndMs);
  }
  return 0;
}

/** Number of appointments still to be served today (active + waiting). */
export function remainingAppointments(entries: ScheduleEntry[]): number {
  return entries.filter(
    (entry) => isActionable(entry.row) && !entry.row.started_at
  ).length;
}

export function remainingMs(entry: ScheduleEntry, now: Date): number {
  return entry.expectedEndMs - now.getTime();
}

/** "MM:SS" or "H:MM:SS"; clamps negatives to zero. */
export function formatCountdown(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Human delay, e.g. "7 min" or "1h 5m" — never a bare countdown like "07:00". */
export function formatDelay(totalMs: number): string {
  const minutes = Math.max(1, Math.round(totalMs / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0) {
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  return `${rest} min`;
}

/** Starts serving a booking (sets started_at; pending -> confirmed). */
export async function startBooking(bookingId: number): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("start_booking", { p_booking_id: bookingId })
      .select(BOOKING_SELECT)
      .single()
  );
}

/** Adds extra minutes to the currently served booking. */
export async function extendBooking(
  bookingId: number,
  minutes: number
): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("extend_booking", { p_booking_id: bookingId, p_minutes: minutes })
      .select(BOOKING_SELECT)
      .single()
  );
}

/** Freezes the running timer of the served booking. */
export async function pauseBooking(bookingId: number): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("pause_booking", { p_booking_id: bookingId })
      .select(BOOKING_SELECT)
      .single()
  );
}

/** Folds the current pause into paused_minutes and resumes the clock. */
export async function resumeBooking(bookingId: number): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("resume_booking", { p_booking_id: bookingId })
      .select(BOOKING_SELECT)
      .single()
  );
}

export type WalkInInput = {
  staffId: number;
  serviceId: number;
  customerId: string;
  startsAt: Date;
};

/** Inserts a confirmed walk-in booking on the spot. */
export async function addWalkIn(input: WalkInInput): Promise<BookingRow> {
  return runQuery<BookingRow>(
    supabase
      .rpc("add_walkin", {
        p_staff_id: input.staffId,
        p_service_id: input.serviceId,
        p_customer_id: input.customerId,
        p_starts_at: input.startsAt.toISOString(),
      })
      .select(BOOKING_SELECT)
      .single()
  );
}

export type WorkDayRow = {
  id: number;
  shop_member_id: number;
  work_date: string;
  started_at: string;
  ended_at: string | null;
};

/** Today's clock-in row for a member, or null when the day was never opened. */
export async function loadWorkday(memberId: number): Promise<WorkDayRow | null> {
  const { data, error } = await supabase
    .from("work_days")
    .select("id, shop_member_id, work_date, started_at, ended_at")
    .eq("shop_member_id", memberId)
    .eq("work_date", toDateKey(new Date()))
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data ?? null) as WorkDayRow | null;
}

/** Opens today's workday (idempotent) and returns the row. */
export async function startWorkday(memberId: number): Promise<WorkDayRow> {
  const { data, error } = await supabase
    .rpc("start_workday", { p_member_id: memberId })
    .select("id, shop_member_id, work_date, started_at, ended_at")
    .single();
  if (error) {
    throw error;
  }
  return data as WorkDayRow;
}

/** Closes today's workday and returns the row. */
export async function endWorkday(memberId: number): Promise<WorkDayRow> {
  const { data, error } = await supabase
    .rpc("end_workday", { p_member_id: memberId })
    .select("id, shop_member_id, work_date, started_at, ended_at")
    .single();
  if (error) {
    throw error;
  }
  return data as WorkDayRow;
}

export type DaySummary = {
  served: number;
  noShows: number;
  revenueCents: number;
  delayMs: number;
  endedAt: string | null;
};

/** Wrap-up stats for today derived from the schedule + workday row. */
export function summarizeDay(
  rows: BookingRow[],
  workday: WorkDayRow | null
): DaySummary {
  let served = 0;
  let noShows = 0;
  let revenueCents = 0;
  for (const row of rows) {
    if (row.status === "completed") {
      served += 1;
      revenueCents += row.service_price_cents || 0;
    } else if (row.status === "no_show") {
      noShows += 1;
    }
  }
  return {
    served,
    noShows,
    revenueCents,
    delayMs: totalDelayMs(buildTodaySchedule(rows)),
    endedAt: workday?.ended_at ?? null,
  };
}

/** Non-PII schedule rows for the staff member who owns the given booking. */
export async function staffDaySchedule(bookingId: number): Promise<BookingRow[]> {
  return runList<BookingRow>(
    supabase.rpc("staff_day_schedule", { p_booking_id: bookingId })
  );
}

export type CustomerProgress = {
  total: number;
  position: number;
  beingServed: boolean;
  nextUp: boolean;
  delayed: boolean;
  activeRemainingMs: number;
};

/**
 * Where the customer's booking stands in the staff member's day, computed with
 * the same schedule engine the barber sees. `null` when the booking isn't part
 * of today's schedule (e.g. it was cancelled).
 */
export function customerProgress(
  staffSchedule: BookingRow[],
  bookingId: number,
  now = new Date()
): CustomerProgress | null {
  const entries = buildTodaySchedule(staffSchedule, now);
  const index = entries.findIndex((entry) => entry.row.id === bookingId);
  if (index === -1) {
    return null;
  }
  const entry = entries[index];
  const active = activeEntry(entries);
  const next = nextEntry(entries);
  return {
    total: entries.length,
    position: index + 1,
    beingServed: active?.row.id === bookingId,
    nextUp: next?.row.id === bookingId && !active,
    delayed: entry.delayMs > 0,
    activeRemainingMs: active?.row.id === bookingId ? remainingMs(entry, now) : 0,
  };
}

/** Re-renders every `intervalMs` so derived timers tick from timestamps. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
