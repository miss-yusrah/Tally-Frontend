"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  getCategoryConfig,
} from "@/features/expenses/categoryConfig";
import { useAddToast } from "@/store";
import type { Expense } from "@/types";

interface ExpenseRowProps {
  expense: Expense;
  tripId: string;
  payerName: string;
  baseCurrency: string;
  isEntering?: boolean;
  showDivider?: boolean;
}

function CategorySwatch({ category }: { category: Expense["category"] }) {
  const config =
    getCategoryConfig(category) ??
    EXPENSE_CATEGORIES.find((c) => c.id === "other")!;
  const Icon = config.icon;

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
      style={{ backgroundColor: `${config.color}26` }}
      aria-hidden
    >
      <Icon
        className="h-5 w-5"
        style={{ color: config.color }}
        strokeWidth={2}
      />
    </div>
  );
}

function CachedRateIndicator() {
  const addToast = useAddToast();

  return (
    <button
      type="button"
      aria-label="Converted using a cached exchange rate"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToast({
          message: "This was converted using a recent cached rate",
          variant: "info",
        });
      }}
      className={cn(
        "-my-1.5 -ml-1.5 -mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
      )}
    >
      <History className="h-3 w-3 text-[#94A3B8]" strokeWidth={2} />
    </button>
  );
}

export function ExpenseRow({
  expense,
  tripId,
  payerName,
  baseCurrency,
  isEntering = false,
}: ExpenseRowProps) {
  const title = expense.note?.trim() || expense.merchant?.trim() || "Expense";
  const payerLabel = payerName.split(" ")[0] || payerName;
  const showBaseConversion = expense.currency !== baseCurrency;
  const usedCachedRate = expense.rateSource === "cached";

  return (
    <Link
      href={`/trips/${tripId}/expenses/${expense.id}`}
      className={cn(
        "flex items-start gap-3 rounded-[16px] border border-[#ffffff18] bg-[#15151E] p-4",
        "shadow-[inset_0_1px_0_#ffffff0c,0_1px_0_#ffffff06]",
        "transition-all duration-fast ease-tally",
        "hover:bg-[#1C1C27] active:scale-[0.985] active:bg-[#1C1C27]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
        isEntering && "animate-expense-row-enter"
      )}
    >
      <CategorySwatch category={expense.category} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[#F8F8FF]">
          {title}
        </p>
        <p
          className="mt-0.5 text-[13px] font-normal text-[#94A3B8] tabular-nums"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {payerLabel} paid · {formatRelativeTime(expense.createdAt)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className="text-[16px] font-bold text-[#F8F8FF] tabular-nums"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {formatCurrency(expense.amountMinorUnits, expense.currency)}
        </p>
        {showBaseConversion && (
          <div className="mt-0.5 flex items-center justify-end gap-1">
            {usedCachedRate && <CachedRateIndicator />}
            <p
              className="text-[12px] font-normal text-[#94A3B8] tabular-nums"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              ({formatCurrency(expense.baseCurrencyAmount, baseCurrency)})
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
