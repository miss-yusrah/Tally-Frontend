import { createClient } from "@/lib/supabase/client";
import type { Trip, TripMember } from "@/types";
import type { AuthUser } from "@/store/authStore";
import {
  fetchMembersForTrip,
  seedMemoryMember,
} from "@/lib/db/members";
import { emitMemberJoinedNotifications } from "@/lib/notifications/emit";

interface TripRow {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  base_currency: string;
  base_currency_locked_at: string | null;
  organizer_id: string;
  invite_token: string;
  created_at: string;
}

function mapTripRow(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    baseCurrency: row.base_currency,
    // Set once by a DB trigger when the first expense lands; never cleared.
    baseCurrencyLockedAt: row.base_currency_locked_at ?? null,
    inviteToken: row.invite_token,
    createdBy: row.organizer_id,
    createdAt: row.created_at,
  };
}

function normalizeTripRow(data: unknown): TripRow | null {
  if (!data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("id" in row)) return null;

  return row as TripRow;
}

export type JoinTripResult =
  | { ok: true; trip: Trip; members: TripMember[]; isNewMember: boolean }
  | { ok: false; error: "INVALID_TOKEN" };

/**
 * Persist a freshly-created trip + its organizer member row to Supabase.
 */
export async function persistTrip(
  trip: Trip,
  organizer: TripMember
): Promise<void> {
  const supabase = createClient();

  const { error: tripError } = await supabase.from("trips").insert({
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    start_date: trip.startDate || null,
    end_date: trip.endDate || null,
    base_currency: trip.baseCurrency,
    organizer_id: trip.createdBy,
    invite_token: trip.inviteToken,
    created_at: trip.createdAt,
  });
  if (tripError) throw tripError;

  const { error: memberError } = await supabase.from("trip_members").insert({
    trip_id: trip.id,
    user_id: organizer.userId,
    role: "organizer",
    display_name: organizer.displayName,
    avatar_url: organizer.avatarUrl ?? null,
  });
  if (memberError) throw memberError;

  seedMemoryMember(organizer);
}

async function lookupTripByToken(token: string): Promise<Trip | null> {
  const supabase = createClient();
  const normalized = decodeURIComponent(token).trim();

  const { data, error } = await supabase.rpc("lookup_trip_by_invite_token", {
    p_token: normalized,
  });

  if (error) {
    console.error("lookup_trip_by_invite_token failed:", error.message, error);
    return null;
  }

  const row = normalizeTripRow(data);
  if (!row) return null;

  return mapTripRow(row);
}

async function isTripMember(tripId: string, userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_trip_member", {
    p_trip_id: tripId,
    p_user_id: userId,
  });

  if (error) {
    console.error("is_trip_member failed:", error.message, error);
    return false;
  }

  return data === true;
}

/**
 * Join a trip via invite token.
 * Case 1: new member — writes MEMBER# row.
 * Case 2: existing member — skips write, returns seamlessly.
 */
export async function joinTripViaToken(
  token: string,
  user: AuthUser
): Promise<JoinTripResult> {
  const normalized = decodeURIComponent(token).trim();
  const trip = await lookupTripByToken(normalized);
  if (!trip) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const alreadyMember = await isTripMember(trip.id, user.id);

  const supabase = createClient();
  const displayName = user.displayName || user.email;

  const { data: tripId, error } = await supabase.rpc("join_trip_via_token", {
    p_token: normalized,
    p_display_name: displayName,
    p_avatar_url: user.avatarUrl ?? null,
  });

  if (error || !tripId) {
    if (error?.message?.includes("INVALID_TOKEN")) {
      return { ok: false, error: "INVALID_TOKEN" };
    }
    console.error("join_trip_via_token failed:", error?.message, error);
    throw error ?? new Error("Failed to join trip");
  }

  const members = await fetchMembersForTrip(trip.id);

  if (!alreadyMember) {
    // Notify every other existing member (not the joiner). Non-blocking.
    emitMemberJoinedNotifications({
      tripId: trip.id,
      tripName: trip.name,
      joiner: {
        userId: user.id,
        displayName,
        avatarUrl: user.avatarUrl,
      },
      members,
    });
  }

  return {
    ok: true,
    trip,
    members,
    isNewMember: !alreadyMember,
  };
}

export async function fetchTripsForUser(userId: string): Promise<Trip[]> {
  const supabase = createClient();
  const { data: memberRows, error: memberError } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", userId);

  if (memberError || !memberRows?.length) return [];

  const tripIds = memberRows.map((r) => r.trip_id);
  const { data: tripRows, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .in("id", tripIds)
    .order("created_at", { ascending: false });

  if (tripError || !tripRows) return [];
  return (tripRows as TripRow[]).map(mapTripRow);
}

export async function fetchTripDetail(
  tripId: string
): Promise<{ trip: Trip | null; members: TripMember[] }> {
  const supabase = createClient();
  const { data: tripRow, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError || !tripRow) {
    return { trip: null, members: [] };
  }

  const members = await fetchMembersForTrip(tripId);
  return { trip: mapTripRow(tripRow as TripRow), members };
}
