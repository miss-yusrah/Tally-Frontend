"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/currency";
import { useActiveTrip, useTripMembers } from "@/store";
import { cn } from "@/lib/utils";

interface SettlementConfirmPageProps {
  params: { tripId: string };
}

function SettlementConfirmContent({ params }: SettlementConfirmPageProps) {
  const searchParams = useSearchParams();
  const trip = useActiveTrip();
  const members = useTripMembers();

  const fromId = searchParams.get("from") ?? "";
  const toId = searchParams.get("to") ?? "";
  const amountRaw = Number(searchParams.get("amount") ?? "0");
  const amount = Number.isFinite(amountRaw) ? Math.round(amountRaw) : 0;

  const payer = members.find((m) => m.userId === fromId);
  const recipient = members.find((m) => m.userId === toId);
  const currency = trip?.baseCurrency ?? "NGN";

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A0A0F] px-6 pb-10 pt-8 safe-top">
      <h1 className="text-[20px] font-bold text-[#F8F8FF]">Confirm payment</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#94A3B8]">
        Settlement recording lands in a future update. This screen confirms the
        tap target from the Balance Dashboard is wired correctly.
      </p>

      {amount > 0 && payer && recipient && (
        <div className="mt-8 rounded-[16px] border border-[#ffffff0f] bg-[#13131A] p-5">
          <p className="text-[15px] font-medium text-[#94A3B8]">
            {payer.displayName} pays {recipient.displayName}
          </p>
          <p className="mt-2 text-[28px] font-bold tabular-nums text-[#F8F8FF]">
            {formatCurrency(amount, currency)}
          </p>
        </div>
      )}

      <Link
        href={`/trips/${params.tripId}/balances`}
        className={cn(
          "mt-10 flex h-12 items-center justify-center rounded-[12px]",
          "bg-accent-gradient text-[15px] font-semibold text-[#F8F8FF]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        )}
      >
        Back to balances
      </Link>
    </div>
  );
}

/**
 * Stub for 4.7 settlement confirmation — tap targets from the Balance
 * Dashboard land here with payer/recipient/amount query params.
 */
export default function SettlementConfirmPage(props: SettlementConfirmPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#0A0A0F]">
          <Spinner size="lg" />
        </div>
      }
    >
      <SettlementConfirmContent {...props} />
    </Suspense>
  );
}
