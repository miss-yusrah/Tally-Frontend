import { create } from "zustand";
import {
  computeNetBalances,
  simplifyDebts,
} from "@/lib/debt-simplification";
import { useExpenseStore } from "@/store/expenseStore";
import { useTripStore } from "@/store/tripStore";
import type {
  Balance,
  Settlement,
  SimplifiedPayment,
  TripBalanceSnapshot,
} from "@/types";

interface BalanceState {
  balancesByTrip: Record<string, TripBalanceSnapshot>;
  settlementsByTrip: Record<string, Settlement[]>;
  isCalculating: boolean;
  setSettlementsForTrip: (tripId: string, settlements: Settlement[]) => void;
  addSettlement: (settlement: Settlement) => void;
  recomputeBalances: (tripId: string) => void;
  clearBalanceState: () => void;
}

const EMPTY_SNAPSHOT: TripBalanceSnapshot = {
  netPositions: {},
  simplifiedDebts: [],
  memberBalances: [],
};

function buildMemberBalances(
  memberIds: string[],
  netPositions: Record<string, number>,
  displayNameFor: (userId: string) => string
): Balance[] {
  return memberIds.map((userId) => ({
    userId,
    displayName: displayNameFor(userId),
    netMinorUnits: netPositions[userId] ?? 0,
  }));
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balancesByTrip: {},
  settlementsByTrip: {},
  isCalculating: false,

  setSettlementsForTrip: (tripId, settlements) =>
    set((state) => ({
      settlementsByTrip: {
        ...state.settlementsByTrip,
        [tripId]: settlements,
      },
    })),

  addSettlement: (settlement) => {
    set((state) => ({
      settlementsByTrip: {
        ...state.settlementsByTrip,
        [settlement.tripId]: [
          ...(state.settlementsByTrip[settlement.tripId] ?? []),
          settlement,
        ],
      },
    }));
    get().recomputeBalances(settlement.tripId);
  },

  /**
   * Full recompute from expenses + settlements — cheap enough to run on every
   * change (small trip member counts). Reads live data from trip/expense stores.
   */
  recomputeBalances: (tripId) => {
    set({ isCalculating: true });

    const tripState = useTripStore.getState();
    const members =
      tripState.activeTrip?.id === tripId
        ? tripState.members
        : tripState.members.length > 0 &&
            tripState.members[0]?.tripId === tripId
          ? tripState.members
          : tripState.members.filter((m) => m.tripId === tripId);

    const memberIds = members.map((m) => m.userId);
    const displayNameFor = (userId: string) =>
      members.find((m) => m.userId === userId)?.displayName ?? "Member";

    const expenses =
      useExpenseStore.getState().expensesByTrip[tripId] ?? [];

    const settlements = get().settlementsByTrip[tripId] ?? [];

    if (memberIds.length === 0) {
      set({
        isCalculating: false,
        balancesByTrip: {
          ...get().balancesByTrip,
          [tripId]: EMPTY_SNAPSHOT,
        },
      });
      return;
    }

    const netPositions = computeNetBalances(
      memberIds,
      expenses.map((e) => ({
        payerId: e.payerId,
        amountMinorUnits: e.amountMinorUnits,
        baseCurrencyAmount: e.baseCurrencyAmount,
        splitMap: e.splitMap,
      })),
      settlements.map((s) => ({
        fromUserId: s.fromUserId,
        toUserId: s.toUserId,
        amountMinorUnits: s.amountMinorUnits,
      }))
    );

    const simplifiedDebts: SimplifiedPayment[] = simplifyDebts(netPositions);

    const memberBalances = buildMemberBalances(
      memberIds,
      netPositions,
      displayNameFor
    );

    set({
      isCalculating: false,
      balancesByTrip: {
        ...get().balancesByTrip,
        [tripId]: { netPositions, simplifiedDebts, memberBalances },
      },
    });
  },

  clearBalanceState: () =>
    set({
      balancesByTrip: {},
      settlementsByTrip: {},
      isCalculating: false,
    }),
}));

export const useTripBalances = (tripId: string) =>
  useBalanceStore((s) => s.balancesByTrip[tripId] ?? EMPTY_SNAPSHOT);

export const useTripSimplifiedDebts = (tripId: string) =>
  useBalanceStore((s) => s.balancesByTrip[tripId]?.simplifiedDebts ?? []);

export const useTripMemberBalances = (tripId: string) =>
  useBalanceStore((s) => s.balancesByTrip[tripId]?.memberBalances ?? []);

export const useBalancesCalculating = () =>
  useBalanceStore((s) => s.isCalculating);

/** @deprecated use useTripMemberBalances(tripId) */
export const useBalances = () =>
  useBalanceStore((s) => s.balancesByTrip);

/** @deprecated use useTripSimplifiedDebts(tripId) */
export const useSimplifiedPayments = () =>
  useBalanceStore((s) => {
    const first = Object.values(s.balancesByTrip)[0];
    return first?.simplifiedDebts ?? [];
  });

export const useSettlements = () =>
  useBalanceStore((s) => Object.values(s.settlementsByTrip).flat());

export const useBalancesLoading = () =>
  useBalanceStore((s) => s.isCalculating);
