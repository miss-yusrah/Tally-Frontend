import { createClient } from "@/lib/supabase/client";
import { emitExpenseLoggedNotifications } from "@/lib/notifications/emit";
import { toDecimalString } from "@/lib/fx-math";
import { generateId } from "@/lib/utils";
import type {
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  FxRateSource,
  TripMember,
} from "@/types";

interface ExpenseRow {
  id: string;
  trip_id: string;
  payer_id: string;
  created_by: string;
  amount_minor_units: number;
  currency: string;
  base_currency_amount: number;
  fx_rate: number | string;
  fx_cached: boolean;
  rate_timestamp: string | null;
  rate_source: FxRateSource | null;
  needs_currency_review: boolean | null;
  category: ExpenseCategory | null;
  note: string | null;
  merchant: string | null;
  split_method: "equal" | "custom";
  split_map: ExpenseSplit[] | null;
  ocr_source: boolean;
  receipt_image_url: string | null;
  created_at: string;
}

const memoryExpenses = new Map<string, Expense[]>();

function mapExpenseRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    payerId: row.payer_id,
    createdBy: row.created_by,
    amountMinorUnits: Number(row.amount_minor_units),
    currency: row.currency,
    baseCurrencyAmount: Number(row.base_currency_amount),
    fxRate: toDecimalString(row.fx_rate),
    fxCached: row.fx_cached,
    rateTimestamp: row.rate_timestamp ?? row.created_at,
    rateSource: row.rate_source ?? (row.fx_cached ? "cached" : "live"),
    needsCurrencyReview: row.needs_currency_review ?? false,
    category: row.category,
    note: row.note ?? undefined,
    merchant: row.merchant ?? undefined,
    splitMethod: row.split_method,
    splitMap: Array.isArray(row.split_map) ? row.split_map : [],
    ocrSource: row.ocr_source,
    receiptImageUrl: row.receipt_image_url ?? undefined,
    createdAt: row.created_at,
  };
}

function memoryUpsert(expense: Expense): Expense {
  const saved = { ...expense, _optimistic: false };
  const list = memoryExpenses.get(expense.tripId) ?? [];
  memoryExpenses.set(expense.tripId, [
    saved,
    ...list.filter((e) => e.id !== expense.id),
  ]);
  return saved;
}

function memoryFetch(tripId: string): Expense[] {
  return [...(memoryExpenses.get(tripId) ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function memoryGet(tripId: string, expenseId: string): Expense | null {
  return memoryExpenses.get(tripId)?.find((e) => e.id === expenseId) ?? null;
}

export function buildExpenseRecord(params: {
  tripId: string;
  payerId: string;
  amountMinorUnits: number;
  currency: string;
  baseCurrency: string;
  /** Resolved by the /api/fx/rate route before the record is built. */
  fx: {
    convertedAmountMinorUnits: number;
    rate: string;
    rateTimestamp: string;
    rateSource: FxRateSource;
  };
  needsCurrencyReview: boolean;
  splitMethod: "equal" | "custom";
  splitMap: ExpenseSplit[];
  category: Expense["category"];
  note?: string;
  receiptImageUrl?: string;
  createdBy: string;
  id?: string;
}): Expense {
  const now = new Date().toISOString();

  return {
    id: params.id ?? generateId(),
    tripId: params.tripId,
    payerId: params.payerId,
    createdBy: params.createdBy,
    amountMinorUnits: params.amountMinorUnits,
    currency: params.currency,
    // BALANCES (4.6): baseCurrencyAmount is the only field balance math may
    // sum — access it through getExpenseAmountForBalances() in lib/fx-math.
    baseCurrencyAmount: params.fx.convertedAmountMinorUnits,
    fxRate: params.fx.rate,
    fxCached: params.fx.rateSource === "cached",
    rateTimestamp: params.fx.rateTimestamp,
    rateSource: params.fx.rateSource,
    needsCurrencyReview: params.needsCurrencyReview,
    category: params.category,
    note: params.note,
    splitMethod: params.splitMethod,
    splitMap: params.splitMap,
    ocrSource: Boolean(params.receiptImageUrl),
    receiptImageUrl: params.receiptImageUrl,
    createdAt: now,
  };
}

/**
 * Persist expense then emit member notifications as a non-blocking side effect.
 * Pass trip/actor context when available so alerts can be denormalized at write time.
 */
export async function persistExpense(
  expense: Expense,
  notify?: {
    tripName: string;
    members: TripMember[];
    actor: {
      userId: string;
      displayName: string;
      avatarUrl?: string;
    };
  }
): Promise<Expense> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      id: expense.id,
      trip_id: expense.tripId,
      payer_id: expense.payerId,
      created_by: expense.createdBy,
      amount_minor_units: expense.amountMinorUnits,
      currency: expense.currency,
      base_currency_amount: expense.baseCurrencyAmount,
      fx_rate: expense.fxRate,
      fx_cached: expense.fxCached,
      rate_timestamp: expense.rateTimestamp,
      rate_source: expense.rateSource,
      needs_currency_review: expense.needsCurrencyReview,
      category: expense.category,
      note: expense.note ?? null,
      merchant: expense.merchant ?? null,
      split_method: expense.splitMethod,
      split_map: expense.splitMap,
      ocr_source: expense.ocrSource,
      receipt_image_url: expense.receiptImageUrl ?? null,
      created_at: expense.createdAt,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to persist expense:", error.message, error);
    throw error;
  }

  const saved = mapExpenseRow(data as ExpenseRow);
  memoryUpsert(saved);

  if (notify) {
    emitExpenseLoggedNotifications({
      expense: saved,
      tripName: notify.tripName,
      members: notify.members,
      actor: notify.actor,
    });
  }

  return saved;
}

export async function fetchExpensesForTrip(tripId: string): Promise<Expense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch expenses:", error.message, error);
    return memoryFetch(tripId);
  }

  const expenses = (data as ExpenseRow[]).map(mapExpenseRow);
  memoryExpenses.set(tripId, expenses);
  return expenses;
}

export async function fetchExpenseById(
  tripId: string,
  expenseId: string
): Promise<Expense | null> {
  const fromMemory = memoryGet(tripId, expenseId);
  if (fromMemory && !fromMemory._optimistic) return fromMemory;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch expense:", error.message, error);
    return fromMemory;
  }

  if (!data) return fromMemory;

  const expense = mapExpenseRow(data as ExpenseRow);
  memoryUpsert(expense);
  return expense;
}

export function seedMemoryExpense(expense: Expense): void {
  memoryUpsert(expense);
}
