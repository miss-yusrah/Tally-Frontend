"use client";

import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface BalancesSummaryCardProps {
  totalOwed: number;
  totalOwing: number;
  currency: string;
}

export function BalancesSummaryCard({
  totalOwed,
  totalOwing,
  currency,
}: BalancesSummaryCardProps) {
  const allSettled = totalOwed === 0 && totalOwing === 0;

  return (
    <div
      className={cn(
        "flex h-[72px] items-center rounded-[16px] border border-[#ffffff0f] bg-[#13131A] px-5",
        "shadow-[inset_0_1px_0_#ffffff0a]"
      )}
      aria-label="Balance summary across all trips"
    >
      {allSettled ? (
        <div className="flex w-full items-center justify-center gap-2">
          <Check className="h-4 w-4 text-[#10B981]" strokeWidth={2.5} />
          <span className="text-[15px] font-semibold text-[#10B981]">
            All settled up
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col justify-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#94A3B8]">
              You&apos;re owed
            </span>
            <span
              className="mt-0.5 text-[20px] font-bold tabular-nums text-[#10B981]"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {formatCurrency(totalOwed, currency)}
            </span>
          </div>

          <div className="mx-5 h-10 w-px shrink-0 bg-[#ffffff0f]" aria-hidden />

          <div className="flex flex-1 flex-col justify-center">
            <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#94A3B8]">
              You owe
            </span>
            <span
              className="mt-0.5 text-[20px] font-bold tabular-nums text-[#F43F5E]"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {formatCurrency(totalOwing, currency)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
