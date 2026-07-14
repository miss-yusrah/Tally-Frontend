"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";
import { TripHero } from "@/features/trips/TripHero";
import { MemberList } from "@/features/trips/MemberList";
import { ExpenseList } from "@/features/expenses/ExpenseList";
import { Spinner } from "@/components/ui/Spinner";
import {
  useActiveTrip,
  useExpenseStore,
  useExpensesForTrip,
  useExpensesLoadedForTrip,
  useExpensesLoading,
  useTripMembers,
  useTripStore,
  useTrips,
  useTripsLoading,
  useUser,
} from "@/store";
import { cn } from "@/lib/utils";

interface TripDetailPageProps {
  params: { tripId: string };
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const tripId = params.tripId;
  const user = useUser();
  const activeTrip = useActiveTrip();
  const trips = useTrips();
  const members = useTripMembers();
  const expenses = useExpensesForTrip(tripId);
  const expensesLoaded = useExpensesLoadedForTrip(tripId);
  const expensesLoading = useExpensesLoading();
  const isLoading = useTripsLoading();

  const trip =
    activeTrip?.id === tripId
      ? activeTrip
      : trips.find((t) => t.id === tripId) ?? null;

  useEffect(() => {
    void useTripStore.getState().fetchTripDetail(tripId);
    void useExpenseStore.getState().fetchExpenses(tripId);
  }, [tripId]);

  useEffect(() => {
    const refresh = () => {
      void useTripStore.getState().fetchTripDetail(tripId, { silent: true });
      void useExpenseStore.getState().fetchExpenses(tripId);
    };

    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tripId]);

  const showInitialLoading = isLoading && !trip;

  const memberName = (userId: string) =>
    members.find((m) => m.userId === userId)?.displayName ?? "Member";

  const totalSpentMinorUnits = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + (e.baseCurrencyAmount || e.amountMinorUnits || 0),
        0
      ),
    [expenses]
  );

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0A0A0F] pb-[calc(4rem+env(safe-area-inset-bottom,0px)+5.5rem)]">
      {showInitialLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : trip ? (
        <>
          <TripHero
            trip={trip}
            memberCount={members.length}
            expenseCount={expenses.length}
            totalSpentMinorUnits={totalSpentMinorUnits}
          />

          <section className="mt-5 px-6" aria-label="Members">
            <h2 className="mb-3 text-[15px] font-semibold text-[#F8F8FF]">
              Members ({members.length})
            </h2>
            <MemberList members={members} currentUserId={user?.id} />
          </section>

          <section id="expenses" className="mt-5 scroll-mt-20 px-6 pb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[#F8F8FF]">
                Expenses
              </h2>
              <Link
                href={`/trips/${tripId}/expenses/new`}
                className={cn(
                  "text-[14px] font-semibold text-[#7C3AED]",
                  "transition-opacity hover:opacity-80",
                  focusRing
                )}
              >
                + Add
              </Link>
            </div>
            {!expensesLoaded && expensesLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <ExpenseList
                expenses={expenses}
                tripId={trip.id}
                baseCurrency={trip.baseCurrency}
                memberName={memberName}
              />
            )}
          </section>

          {/* Floating CTA — matches content gutters; clear air above bottom nav */}
          <div
            className="pointer-events-none fixed inset-x-0 z-30"
            style={{
              bottom:
                "calc(4rem + env(safe-area-inset-bottom, 0px) + 20px)",
            }}
          >
            <div className="pointer-events-auto mx-auto w-full max-w-mobile px-6">
              <Link
                href={`/trips/${tripId}/balances`}
                className={cn(
                  "flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px]",
                  "bg-accent-gradient text-[15px] font-semibold text-[#F8F8FF]",
                  "shadow-[0_0_20px_#7C3AED50]",
                  "transition-transform duration-fast ease-tally active:scale-[0.98]",
                  focusRing
                )}
              >
                <Scale className="h-[18px] w-[18px]" strokeWidth={2} />
                View balances
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-center text-[14px] text-[#94A3B8]">
            Trip not found.
          </p>
        </div>
      )}
    </div>
  );
}
