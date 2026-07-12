"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SettledRow } from "@/features/settlements/SettledRow";
import { Spinner } from "@/components/ui/Spinner";
import {
  useActiveTrip,
  useSettlementStore,
  useSettlementsForTrip,
  useSettlementsLoading,
  useTripMembers,
  useTripStore,
  useTrips,
} from "@/store";
import { cn } from "@/lib/utils";

interface SettlementHistoryPageProps {
  params: { tripId: string };
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <FileText className="h-8 w-8 text-[#475569]" strokeWidth={1.75} />
      <p className="mt-3 text-[15px] font-medium text-[#94A3B8]">
        No settlements recorded yet
      </p>
      <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-[#475569]">
        When someone marks a payment as settled, it will appear here.
      </p>
    </div>
  );
}

export default function SettlementHistoryPage({
  params,
}: SettlementHistoryPageProps) {
  const { tripId } = params;
  const activeTrip = useActiveTrip();
  const trips = useTrips();
  const members = useTripMembers();
  const settlements = useSettlementsForTrip(tripId);
  const isLoading = useSettlementsLoading();
  const fetchSettlementHistory = useSettlementStore(
    (s) => s.fetchSettlementHistory
  );

  const trip =
    activeTrip?.id === tripId
      ? activeTrip
      : trips.find((t) => t.id === tripId) ?? null;

  const currency = trip?.baseCurrency ?? "NGN";

  useEffect(() => {
    void useTripStore.getState().fetchTripDetail(tripId, { silent: true });
    void fetchSettlementHistory(tripId);
  }, [tripId, fetchSettlementHistory]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members]
  );

  const confirmed = settlements.filter((s) => !s._optimistic);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A0A0F]">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#ffffff0f] bg-[#0A0A0F]/95 backdrop-blur-lg safe-top">
        <Link
          href={`/trips/${tripId}/balances`}
          aria-label="Back to balances"
          className={cn(
            "ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
            "transition-colors hover:bg-[#1C1C27]",
            focusRing
          )}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold text-[#F8F8FF]">
          Settlement history
        </h1>
      </header>

      {isLoading && confirmed.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : confirmed.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-2">
          {confirmed.map((settlement, index) => (
            <SettledRow
              key={settlement.id}
              settlement={settlement}
              payer={memberById.get(settlement.fromUserId)}
              recipient={memberById.get(settlement.toUserId)}
              currency={currency}
              variant="history"
              showDivider={index < confirmed.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
