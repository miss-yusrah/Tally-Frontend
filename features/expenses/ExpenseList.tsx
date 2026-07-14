"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Receipt } from "lucide-react";
import { ExpenseRow } from "@/features/expenses/ExpenseRow";
import type { Expense } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  tripId: string;
  baseCurrency: string;
  memberName: (userId: string) => string;
}

export function ExpenseList({
  expenses,
  tripId,
  baseCurrency,
  memberName,
}: ExpenseListProps) {
  const sorted = useMemo(
    () =>
      [...expenses].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [expenses]
  );
  const expenseIdsKey = useMemo(
    () => sorted.map((e) => e.id).join(","),
    [sorted]
  );

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(sorted.map((e) => e.id));

    if (!initializedRef.current) {
      knownIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    const newIds = sorted
      .filter((e) => !knownIdsRef.current.has(e.id))
      .map((e) => e.id);

    if (newIds.length > 0) {
      setEnteringIds(new Set(newIds));
      const timer = setTimeout(() => setEnteringIds(new Set()), 320);
      knownIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    knownIdsRef.current = currentIds;
  }, [expenseIdsKey, sorted]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Receipt className="h-8 w-8 text-[#475569]" strokeWidth={1.75} />
        <p className="mt-3 text-[15px] font-medium text-[#94A3B8]">
          No expenses logged yet
        </p>
        <p className="mt-1 text-[13px] font-normal text-[#475569]">
          Tap + Add to log the first one
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          tripId={tripId}
          payerName={memberName(expense.payerId)}
          baseCurrency={baseCurrency}
          isEntering={enteringIds.has(expense.id)}
        />
      ))}
    </div>
  );
}
