import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils";
import type { Expense, ExpenseCategory, ExpenseSplit } from "@/types";

interface ExpenseRow {
  id: string;
  trip_id: string;
  payer_id: string;
  created_by: string;
  amount_minor_units: number;
  currency: string;
  base_currency_amount: number;
  fx_rate: number;
  fx_cached: boolean;
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
    fxRate: Number(row.fx_rate),
    fxCached: row.fx_cached,
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
  splitMethod: "equal" | "custom";
  splitMap: ExpenseSplit[];
  category: Expense["category"];
  note?: string;
  receiptImageUrl?: string;
  createdBy: string;
  id?: string;
}): Expense {
  const now = new Date().toISOString();
  const sameCurrency = params.currency === params.baseCurrency;

  return {
    id: params.id ?? generateId(),
    tripId: params.tripId,
    payerId: params.payerId,
    createdBy: params.createdBy,
    amountMinorUnits: params.amountMinorUnits,
    currency: params.currency,
    baseCurrencyAmount: sameCurrency
      ? params.amountMinorUnits
      : params.amountMinorUnits,
    fxRate: 1,
    fxCached: false,
    category: params.category,
    note: params.note,
    splitMethod: params.splitMethod,
    splitMap: params.splitMap,
    ocrSource: Boolean(params.receiptImageUrl),
    receiptImageUrl: params.receiptImageUrl,
    createdAt: now,
  };
}

export async function persistExpense(expense: Expense): Promise<Expense> {
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
