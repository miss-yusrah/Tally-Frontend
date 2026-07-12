"use client";

import { useEffect } from "react";
import { TripDetailHeader } from "@/features/trips/TripDetailHeader";
import { TripMetaRow } from "@/features/trips/TripMetaRow";
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
} from "@/store";

interface TripDetailPageProps {
  params: { tripId: string };
}

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const tripId = params.tripId;
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

  const tripName = trip?.name ?? "Trip";
  const showInitialLoading = isLoading && !trip;

  const memberName = (userId: string) =>
    members.find((m) => m.userId === userId)?.displayName ?? "Member";

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A0A0F]">
      <TripDetailHeader title={tripName} tripId={tripId} />

      {showInitialLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : trip ? (
        <>
          <TripMetaRow trip={trip} />

          <section className="mt-7">
            <h2 className="mb-4 px-6 text-[15px] font-semibold text-[#F8F8FF]">
              Members ({members.length})
            </h2>
            <MemberList members={members} />
          </section>

          <div className="mx-6 mt-6 border-t border-[#ffffff0f]" />

          <section id="expenses" className="mt-6 scroll-mt-20">
            <h2 className="mb-4 px-6 text-[15px] font-semibold text-[#F8F8FF]">
              Expenses
            </h2>
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
