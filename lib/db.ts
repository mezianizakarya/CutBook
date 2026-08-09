import type { PostgrestError } from "@supabase/supabase-js";

/** A Postgrest query promise (list, `.single()` or `.maybeSingle()` result). */
type QueryResult = PromiseLike<{ data: unknown; error: PostgrestError | null }>;

/**
 * Dedupes numeric ids while preserving order. Empty input returns [] so
 * callers can skip `.in()` queries that PostgREST would reject.
 */
export function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

/** Runs a list query and returns its rows (empty array when null). */
export async function runList<T>(query: QueryResult): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as T[];
}

/** Runs a `.single()` query and returns the row. */
export async function runQuery<T>(query: QueryResult): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data as unknown as T;
}

/** Runs a `.maybeSingle()` query and returns the row or null. */
export async function runMaybe<T>(query: QueryResult): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data as unknown as T | null) ?? null;
}
