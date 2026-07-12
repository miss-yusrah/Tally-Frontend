import type { Trip } from "@/types";

/** Today as a local `yyyy-mm-dd` string — no UTC drift from toISOString(). */
function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A trip is Past only when it has a valid end date strictly before today
 * (local calendar date). Missing or malformed dates always mean Active —
 * an undated trip is assumed ongoing.
 */
export function isPastTrip(trip: Trip, today = todayLocalISO()): boolean {
  if (!trip.endDate || !ISO_DATE_RE.test(trip.endDate)) return false;
  // ISO yyyy-mm-dd compares correctly as a plain string.
  return trip.endDate < today;
}

/**
 * Split trips into Active / Past groups for the dashboard, each sorted by
 * createdAt descending (most recently created first).
 */
export function partitionTripsByStatus(trips: Trip[]): {
  active: Trip[];
  past: Trip[];
} {
  const today = todayLocalISO();
  const byNewest = (a: Trip, b: Trip) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  const active: Trip[] = [];
  const past: Trip[] = [];
  for (const trip of trips) {
    (isPastTrip(trip, today) ? past : active).push(trip);
  }

  return { active: active.sort(byNewest), past: past.sort(byNewest) };
}

/** Sort trips by startDate descending (most recent first). Undated trips sink to the bottom. */
export function sortTripsByStartDate(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const aDate = a.startDate || "0000-00-00";
    const bDate = b.startDate || "0000-00-00";
    return bDate.localeCompare(aDate);
  });
}

