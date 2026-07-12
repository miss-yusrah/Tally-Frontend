import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils";
import type { Settlement } from "@/types";

interface SettlementRow {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount_minor_units: number;
  currency: string;
  confirmed_by: string;
  idempotency_token: string;
  status: string;
  settled_at: string;
}

const memorySettlements = new Map<string, Settlement[]>();

export class SettlementDuplicateError extends Error {
  constructor() {
    super("SETTLEMENT_DUPLICATE");
    this.name = "SettlementDuplicateError";
  }
}

function mapSettlementRow(row: SettlementRow): Settlement {
  return {
    id: row.id,
    tripId: row.trip_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amountMinorUnits: Number(row.amount_minor_units),
    currency: row.currency,
    confirmedBy: row.confirmed_by,
    idempotencyToken: row.idempotency_token,
    status: "confirmed",
    settledAt: row.settled_at,
  };
}

function memoryUpsert(settlement: Settlement): Settlement {
  const saved = { ...settlement, _optimistic: false };
  const list = memorySettlements.get(settlement.tripId) ?? [];
  memorySettlements.set(settlement.tripId, [
    saved,
    ...list.filter((s) => s.id !== settlement.id),
  ]);
  return saved;
}

function memoryFetch(tripId: string): Settlement[] {
  return [...(memorySettlements.get(tripId) ?? [])].sort(
    (a, b) =>
      new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
  );
}

export function buildSettlementRecord(params: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amountMinorUnits: number;
  currency: string;
  confirmedBy: string;
  idempotencyToken: string;
  id?: string;
  settledAt?: string;
}): Settlement {
  return {
    id: params.id ?? generateId(),
    tripId: params.tripId,
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
    amountMinorUnits: params.amountMinorUnits,
    currency: params.currency,
    confirmedBy: params.confirmedBy,
    idempotencyToken: params.idempotencyToken,
    status: "confirmed",
    settledAt: params.settledAt ?? new Date().toISOString(),
  };
}

/**
 * Atomic insert — duplicate idempotency_token fails at the DB (unique constraint),
 * which we treat as a successful no-op for double-tap races.
 */
export async function persistSettlement(
  settlement: Settlement
): Promise<Settlement> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("settlements")
    .insert({
      id: settlement.id,
      trip_id: settlement.tripId,
      from_user_id: settlement.fromUserId,
      to_user_id: settlement.toUserId,
      amount_minor_units: settlement.amountMinorUnits,
      currency: settlement.currency,
      confirmed_by: settlement.confirmedBy,
      idempotency_token: settlement.idempotencyToken,
      status: settlement.status,
      settled_at: settlement.settledAt,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new SettlementDuplicateError();
    }
    console.error("Failed to persist settlement:", error.message, error);
    throw error;
  }

  const saved = mapSettlementRow(data as SettlementRow);
  memoryUpsert(saved);
  return saved;
}

export async function fetchSettlementByToken(
  idempotencyToken: string
): Promise<Settlement | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("idempotency_token", idempotencyToken)
    .maybeSingle();

  if (error || !data) return null;
  return mapSettlementRow(data as SettlementRow);
}

export async function fetchSettlementsForTrip(
  tripId: string
): Promise<Settlement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("trip_id", tripId)
    .order("settled_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch settlements:", error.message, error);
    return memoryFetch(tripId);
  }

  const settlements = (data as SettlementRow[]).map(mapSettlementRow);
  memorySettlements.set(tripId, settlements);
  return settlements;
}
