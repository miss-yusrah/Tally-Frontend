"use client";

import { useEffect, useMemo } from "react";
import { Scale } from "lucide-react";
import { useAuthSession } from "@/features/auth";
import { BalancesSkeleton } from "@/features/balances/BalancesSkeleton";
import { BalancesSummaryCard } from "@/features/balances/BalancesSummaryCard";
import { TripBalanceCard } from "@/features/balances/TripBalanceCard";
import { fetchMembersForTrip } from "@/lib/db/members";
import { sortTripsByStartDate } from "@/lib/trips";
import {
  useAggregateSummary,
  useBalanceMembersByTrip,
  useBalanceStore,
  useBalancesFetchingAll,
  useHomeCurrency,
  useTripStore,
  useTrips,
  useTripsLoading,
  useUnsettledCountByTrip,
} from "@/store";
import { cn } from "@/lib/utils";
import type { TripMember } from "@/types";

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-16 pt-10 text-center">
      <div
        className={cn(
          "flex h-24 w-24 items-center justify-center rounded-[24px]",
          "border border-[#ffffff0f] bg-[#13131A]",
          "shadow-[inset_0_1px_0_#ffffff0a]"
        )}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient
              id="balances-empty-grad"
              x1="4"
              y1="4"
              x2="36"
              y2="36"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          <path
            d="M8 28h24M12 28V14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"
            stroke="url(#balances-empty-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M16 18h8M20 14v8"
            stroke="url(#balances-empty-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-[19px] font-bold text-[#F8F8FF]">
        No trips to balance yet
      </h2>
      <p className="mt-2 max-w-[260px] text-[14px] font-normal leading-[1.6] text-[#94A3B8]">
        Create a trip and start logging expenses to see balances here.
      </p>
    </div>
  );
}

export default function GlobalBalancesPage() {
  const { user } = useAuthSession();
  const trips = useTrips();
  const tripsLoading = useTripsLoading();
  const homeCurrency = useHomeCurrency();
  const aggregateSummary = useAggregateSummary();
  const unsettledCountByTrip = useUnsettledCountByTrip();
  const membersByTrip = useBalanceMembersByTrip();
  const isFetchingAll = useBalancesFetchingAll();
  const fetchTrips = useTripStore((s) => s.fetchTrips);
  const fetchAllTripBalances = useBalanceStore((s) => s.fetchAllTripBalances);
  const balancesByTrip = useBalanceStore((s) => s.balancesByTrip);

  const sortedTrips = useMemo(() => sortTripsByStartDate(trips), [trips]);

  useEffect(() => {
    if (user?.onboardingComplete) {
      void fetchTrips(user);
    }
  }, [user?.id, user?.onboardingComplete, fetchTrips, user]);

  useEffect(() => {
    if (!user?.id || trips.length === 0) return;
    void fetchAllTripBalances(user.id);
  }, [user?.id, trips, fetchAllTripBalances]);

  // Lazy member avatars — non-blocking background hydration per trip.
  useEffect(() => {
    if (trips.length === 0) return;
    let cancelled = false;

    void (async () => {
      const cached = useBalanceStore.getState().membersByTrip;
      const tripsNeedingMembers = trips.filter((t) => !cached[t.id]?.length);
      if (tripsNeedingMembers.length === 0) return;

      const entries = await Promise.all(
        tripsNeedingMembers.map(async (trip) => {
          const members = await fetchMembersForTrip(trip.id).catch(
            () => [] as TripMember[]
          );
          return [trip.id, members] as const;
        })
      );

      if (cancelled) return;

      const patch: Record<string, TripMember[]> = {};
      for (const [tripId, members] of entries) {
        if (members.length) patch[tripId] = members;
      }
      if (Object.keys(patch).length > 0) {
        useBalanceStore.setState((state) => ({
          membersByTrip: { ...state.membersByTrip, ...patch },
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trips]);

  const balancesReady =
    trips.length > 0 &&
    trips.every((trip) => trip.id in balancesByTrip);

  const showSkeleton =
    tripsLoading ||
    isFetchingAll ||
    (trips.length > 0 && Boolean(user?.id) && !balancesReady);

  let enterIndex = 0;
  const stagger = () => ({
    animationDelay: `${Math.min(enterIndex++ * 60, 360)}ms`,
  });

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0A0A0F] pb-28">
      {/* Ambient glow — cobalt tone for analysis/review context */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle 300px at 195px 60px, rgba(37, 99, 235, 0.10), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-6 pb-2 pt-4 safe-top">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#475569]">
          Overview
        </p>
        <h1 className="mt-0.5 text-[28px] font-bold tracking-[-0.01em] text-[#F8F8FF]">
          Balances
        </h1>
      </header>

      <div className="relative z-10 flex flex-1 flex-col px-6">
        {showSkeleton ? (
          <div className="mt-5">
            <BalancesSkeleton />
          </div>
        ) : trips.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div
              style={stagger()}
              className="animate-balances-item-enter mt-5"
            >
              <BalancesSummaryCard
                totalOwed={aggregateSummary.totalOwed}
                totalOwing={aggregateSummary.totalOwing}
                currency={homeCurrency}
              />
            </div>

            <div
              style={stagger()}
              className="animate-balances-item-enter mt-5 flex items-center gap-1.5"
            >
              <Scale
                className="h-3 w-3 shrink-0 text-[#475569]"
                strokeWidth={2}
                aria-hidden
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
                Your trips
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3 pb-6">
              {sortedTrips.map((trip) => {
                const userNet =
                  user?.id != null
                    ? (balancesByTrip[trip.id]?.netPositions[user.id] ?? 0)
                    : 0;
                const members = membersByTrip[trip.id];
                const membersLoading = !members?.length;

                return (
                  <div
                    key={trip.id}
                    style={stagger()}
                    className="animate-balances-item-enter"
                  >
                    <TripBalanceCard
                      trip={trip}
                      netMinorUnits={userNet}
                      unsettledCount={unsettledCountByTrip[trip.id] ?? 0}
                      members={members}
                      membersLoading={membersLoading}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
