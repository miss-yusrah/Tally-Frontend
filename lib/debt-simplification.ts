import {
  getExpenseAmountForBalances,
  scaleSplitsToBaseCurrency,
} from "@/lib/fx-math";
import type { SimplifiedPayment } from "@/types";

interface BalanceEntry {
  userId: string;
  amount: number;
}

/** Guard against fractional minor units — all ledger math must be integers. */
function assertIntegerMinorUnits(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    console.warn(`[debt-simplification] Invalid ${label}: ${value}`);
    return 0;
  }
  if (!Number.isInteger(value)) {
    console.warn(
      `[debt-simplification] Non-integer ${label}: ${value} — rounding`
    );
    return Math.round(value);
  }
  return value;
}

/**
 * Greedy minimum-cash-flow debt simplification.
 *
 * Input balances must already be net of recorded settlements (4.7): callers
 * pass settlement-adjusted net positions via computeNetBalances(), which
 * applies SETTLE# records before this function runs.
 *
 * All amounts are integer minor units in the trip base currency.
 * Positive = creditor (owed money); negative = debtor (owes money).
 * Zero-balance members are omitted from the output entirely.
 */
export function simplifyDebts(
  balances: Record<string, number>
): SimplifiedPayment[] {
  const creditors: BalanceEntry[] = Object.entries(balances)
    .map(([userId, amount]) => ({
      userId,
      amount: assertIntegerMinorUnits(amount, `balance:${userId}`),
    }))
    .filter(({ amount }) => amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const debtors: BalanceEntry[] = Object.entries(balances)
    .map(([userId, amount]) => ({
      userId,
      amount: assertIntegerMinorUnits(amount, `balance:${userId}`),
    }))
    .filter(({ amount }) => amount < 0)
    .sort((a, b) => a.amount - b.amount);

  const payments: SimplifiedPayment[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const amount = assertIntegerMinorUnits(
      Math.min(creditor.amount, -debtor.amount),
      "settlement-amount"
    );

    if (amount > 0) {
      payments.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountMinorUnits: amount,
      });
    }

    creditor.amount -= amount;
    debtor.amount += amount;

    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return payments;
}

/**
 * BALANCES (4.6) — multi-currency invariant:
 * every number in this ledger is TRIP BASE CURRENCY minor units. The payer is
 * credited with the expense's CONVERTED amount (getExpenseAmountForBalances,
 * never amountMinorUnits) and split shares — stored in the original currency —
 * are scaled into base currency before being debited.
 */
export function computeNetBalances(
  memberIds: string[],
  expenses: {
    payerId: string;
    amountMinorUnits: number;
    baseCurrencyAmount: number;
    splitMap: { userId: string; amountMinorUnits: number }[];
  }[],
  settlements: {
    fromUserId: string;
    toUserId: string;
    amountMinorUnits: number;
  }[] = []
): Record<string, number> {
  const balances: Record<string, number> = {};
  memberIds.forEach((id) => {
    balances[id] = 0;
  });

  for (const expense of expenses) {
    balances[expense.payerId] =
      (balances[expense.payerId] ?? 0) + getExpenseAmountForBalances(expense);

    for (const split of scaleSplitsToBaseCurrency(expense)) {
      balances[split.userId] =
        (balances[split.userId] ?? 0) - split.amountMinorUnits;
    }
  }

  for (const settlement of settlements) {
    balances[settlement.fromUserId] =
      (balances[settlement.fromUserId] ?? 0) + settlement.amountMinorUnits;
    balances[settlement.toUserId] =
      (balances[settlement.toUserId] ?? 0) - settlement.amountMinorUnits;
  }

  return balances;
}
