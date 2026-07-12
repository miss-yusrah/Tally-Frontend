"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MemberBalanceRow } from "@/features/balances/MemberBalanceRow";
import {
  SettlementCard,
  SettlementsEmptyState,
} from "@/features/balances/SettlementCard";
import {
  YourPositionCard,
  type PositionState,
} from "@/features/balances/YourPositionCard";
import { Spinner } from "@/components/ui/Spinner";
import {
  useActiveTrip,
  useBalanceStore,
  useExpenseStore,
  useTripBalances,
  useTripMembers,
  useTripStore,
  useTrips,
  useUser,
} from "@/store";
import { cn } from "@/lib/utils";

interface BalancesPageProps {
  params: { tripId: string };
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

export default function BalancesPage({ params }: BalancesPageProps) {
  const { tripId } = params;
  const user = useUser();
  const activeTrip = useActiveTrip();
  const trips = useTrips();
  const members = useTripMembers();
  const snapshot = useTripBalances(tripId);
  const recomputeBalances = useBalanceStore((s) => s.recomputeBalances);
  const isCalculating = useBalanceStore((s) => s.isCalculating);

  const trip =
    activeTrip?.id === tripId
      ? activeTrip
      : trips.find((t) => t.id === tripId) ?? null;

  const currency = trip?.baseCurrency ?? "NGN";

  useEffect(() => {
    void useTripStore.getState().fetchTripDetail(tripId, { silent: true });
    void useExpenseStore.getState().fetchExpenses(tripId);
  }, [tripId]);

  useEffect(() => {
    recomputeBalances(tripId);
  }, [tripId, recomputeBalances]);

  // Recompute whenever expenses for this trip change (reactive, no pull-to-refresh).
  const expenses = useExpenseStore((s) => s.expensesByTrip[tripId]);
  const expenseKey = useMemo(
    () =>
      (expenses ?? [])
        .map(
          (e) =>
            `${e.id}:${e.payerId}:${e.baseCurrencyAmount}:${JSON.stringify(e.splitMap)}`
        )
        .join("|"),
    [expenses]
  );

  const memberKey = useMemo(
    () => members.map((m) => m.userId).join(","),
    [members]
  );

  useEffect(() => {
    recomputeBalances(tripId);
  }, [tripId, expenseKey, memberKey, recomputeBalances]);

  const currentUserId = user?.id;
  const userNet = currentUserId
    ? (snapshot.netPositions[currentUserId] ?? 0)
    : 0;

  const positionState: PositionState =
    userNet > 0 ? "creditor" : userNet < 0 ? "debtor" : "settled";

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m])),
    [members]
  );

  const paymentIdsKey = snapshot.simplifiedDebts
    .map((p) => `${p.fromUserId}-${p.toUserId}-${p.amountMinorUnits}`)
    .join(",");

  const knownPaymentsRef = useRef<Set<string>>(new Set());
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const current = new Set(
      snapshot.simplifiedDebts.map(
        (p) => `${p.fromUserId}-${p.toUserId}-${p.amountMinorUnits}`
      )
    );

    const newKeys = [...current].filter((k) => !knownPaymentsRef.current.has(k));
    if (newKeys.length > 0) {
      setEnteringKeys(new Set(newKeys));
      const timer = setTimeout(() => setEnteringKeys(new Set()), 320);
      knownPaymentsRef.current = current;
      return () => clearTimeout(timer);
    }

    knownPaymentsRef.current = current;
  }, [paymentIdsKey, snapshot.simplifiedDebts]);

  const sortedMembers = useMemo(
    () =>
      [...snapshot.memberBalances].sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        return a.displayName.localeCompare(b.displayName);
      }),
    [snapshot.memberBalances, currentUserId]
  );

  const showLoading = isCalculating && snapshot.memberBalances.length === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A0A0F]">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#ffffff0f] bg-[#0A0A0F]/95 backdrop-blur-lg safe-top">
        <Link
          href={`/trips/${tripId}`}
          aria-label="Back to trip"
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
          Balances
        </h1>
      </header>

      {showLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-5">
          <YourPositionCard
            state={positionState}
            amountMinorUnits={userNet}
            currency={currency}
          />

          <section className="mt-6" aria-label="Simplified settlements">
            <h2 className="mb-4 text-[16px] font-semibold text-[#F8F8FF]">
              Settle up
            </h2>

            {snapshot.simplifiedDebts.length === 0 ? (
              <SettlementsEmptyState />
            ) : (
              <div className="flex flex-col gap-3">
                {snapshot.simplifiedDebts.map((payment) => {
                  const key = `${payment.fromUserId}-${payment.toUserId}-${payment.amountMinorUnits}`;
                  return (
                    <SettlementCard
                      key={key}
                      payment={payment}
                      tripId={tripId}
                      payer={memberById.get(payment.fromUserId)}
                      recipient={memberById.get(payment.toUserId)}
                      currency={currency}
                      currentUserId={currentUserId}
                      isEntering={enteringKeys.has(key)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8" aria-label="All members">
            <div className="mb-4 border-t border-[#ffffff0f] pt-6">
              <h2 className="text-[15px] font-semibold text-[#F8F8FF]">
                All members
              </h2>
            </div>
            <div>
              {sortedMembers.map((balance, index) => (
                <MemberBalanceRow
                  key={balance.userId}
                  balance={balance}
                  currency={currency}
                  isCurrentUser={balance.userId === currentUserId}
                  showDivider={index < sortedMembers.length - 1}
                />
              ))}
            </div>
          </section>

          <div className="mt-8 flex justify-center pb-4">
            <Link
              href={`/trips/${tripId}#expenses`}
              className={cn(
                "inline-flex h-11 items-center gap-1 text-[14px] font-medium text-[#94A3B8]",
                "transition-colors hover:text-[#F8F8FF]",
                focusRing
              )}
            >
              View full history
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
