"use client";

import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useCountUp } from "@/features/balances/useCountUp";
import { cn } from "@/lib/utils";

export type PositionState = "creditor" | "debtor" | "settled";

interface YourPositionCardProps {
  state: PositionState;
  amountMinorUnits: number;
  currency: string;
}

export function YourPositionCard({
  state,
  amountMinorUnits,
  currency,
}: YourPositionCardProps) {
  const animatedAmount = useCountUp(
    state === "settled" ? 0 : Math.abs(amountMinorUnits)
  );

  const cardStyles = {
    creditor: {
      background:
        "linear-gradient(135deg, #10B98126 0%, #10B98108 100%)",
      border: "1px solid #10B98140",
      label: "YOU'RE OWED",
      labelColor: "#10B981",
    },
    debtor: {
      background:
        "linear-gradient(135deg, #F43F5E26 0%, #F43F5E08 100%)",
      border: "1px solid #F43F5E40",
      label: "YOU OWE",
      labelColor: "#F43F5E",
    },
    settled: {
      background: "#13131A",
      border: "1px solid #ffffff0f",
      label: "ALL SETTLED",
      labelColor: "#94A3B8",
    },
  }[state];

  return (
    <div
      className="flex h-[140px] flex-col justify-center rounded-[20px] px-6"
      style={{
        background: cardStyles.background,
        border: cardStyles.border,
      }}
    >
      <p
        className="text-[13px] font-medium uppercase tracking-[0.04em]"
        style={{ color: cardStyles.labelColor }}
      >
        {cardStyles.label}
      </p>

      {state === "settled" ? (
        <div className="mt-2 flex items-center gap-2">
          <Check className="h-5 w-5 shrink-0 text-[#10B981]" strokeWidth={2.5} />
          <p className="text-[20px] font-semibold text-[#F8F8FF]">
            You&apos;re all settled up
          </p>
        </div>
      ) : (
        <p
          className="mt-2 text-[36px] font-bold tabular-nums text-[#F8F8FF]"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {formatCurrency(animatedAmount, currency)}
        </p>
      )}
    </div>
  );
}
