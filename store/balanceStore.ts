import { create } from "zustand";
import {
  computeNetBalances,
  simplifyDebts,
} from "@/lib/debt-simplification";
import { fetchMembersForTrip } from "@/lib/db/members";
import { useAuthStore } from "@/store/authStore";
import { useExpenseStore } from "@/store/expenseStore";
import { useTripStore } from "@/store/tripStore";
import type {
  Balance,
  Settlement,
  SimplifiedPayment,
  TripBalanceSnapshot,
  TripMember,
} from "@/types";

interface AggregateSummary {
  totalOwed: number;
  totalOwing: number;
}

interface BalanceState {
  balancesByTrip: Record<string, TripBalanceSnapshot>;
  settlementsByTrip: Record<string, Settlement[]>;
  /** MVP: raw minor-unit sums across trips — displayed in homeCurrency without FX conversion. */
  aggregateSummary: AggregateSummary;
  unsettledCountByTrip: Record<string, number>;
  membersByTrip: Record<string, TripMember[]>;
  isCalculating: boolean;
  isFetchingAll: boolean;
  setSettlementsForTrip: (tripId: string, settlements: Settlement[]) => void;
  addSettlement: (settlement: Settlement) => void;
  recomputeBalances: (tripId: string, membersOverride?: TripMember[]) => void;
  fetchAllTripBalances: (userId: string) => Promise<void>;
  clearBalanceState: () => void;
}

const EMPTY_SNAPSHOT: TripBalanceSnapshot = {
  netPositions: {},
  simplifiedDebts: [],
  memberBalances: [],
};

const EMPTY_AGGREGATE: AggregateSummary = { totalOwed: 0, totalOwing: 0 };

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

function resolveMembersForTrip(
  tripId: string,
  membersOverride: TripMember[] | undefined,
  cachedMembersByTrip: Record<string, TripMember[]>
): TripMember[] {
  if (membersOverride?.length) return membersOverride;
  if (cachedMembersByTrip[tripId]?.length) return cachedMembersByTrip[tripId];

  const tripState = useTripStore.getState();
  if (tripState.activeTrip?.id === tripId) return tripState.members;
  if (
    tripState.members.length > 0 &&
    tripState.members[0]?.tripId === tripId
  ) {
    return tripState.members;
  }
  return tripState.members.filter((m) => m.tripId === tripId);
}

function deriveAggregateSummary(
  userId: string | undefined,
  trips: { id: string }[],
  balancesByTrip: Record<string, TripBalanceSnapshot>
): AggregateSummary {
  if (!userId) return EMPTY_AGGREGATE;

  let totalOwed = 0;
  let totalOwing = 0;

  for (const trip of trips) {
    const net = balancesByTrip[trip.id]?.netPositions[userId] ?? 0;
    if (net > 0) totalOwed += net;
    else if (net < 0) totalOwing += -net;
  }

  return { totalOwed, totalOwing };
}

function deriveUnsettledCounts(
  balancesByTrip: Record<string, TripBalanceSnapshot>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [tripId, snapshot] of Object.entries(balancesByTrip)) {
    counts[tripId] = snapshot.simplifiedDebts.length;
  }
  return counts;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balancesByTrip: {},
  settlementsByTrip: {},
  aggregateSummary: EMPTY_AGGREGATE,
  unsettledCountByTrip: {},
  membersByTrip: {},
  isCalculating: false,
  isFetchingAll: false,

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

  recomputeBalances: (tripId, membersOverride) => {
    set({ isCalculating: true });

    const members = resolveMembersForTrip(
      tripId,
      membersOverride,
      get().membersByTrip
    );

    const memberIds = members.map((m) => m.userId);
    const displayNameFor = (userId: string) =>
      members.find((m) => m.userId === userId)?.displayName ?? "Member";

    const expenses =
      useExpenseStore.getState().expensesByTrip[tripId] ?? [];

    const settlements = get().settlementsByTrip[tripId] ?? [];

    const membersPatch =
      membersOverride?.length || members.length
        ? {
            membersByTrip: {
              ...get().membersByTrip,
              ...(members.length ? { [tripId]: members } : {}),
            },
          }
        : {};

    if (memberIds.length === 0) {
      const balancesByTrip = {
        ...get().balancesByTrip,
        [tripId]: EMPTY_SNAPSHOT,
      };
      const userId = useAuthStore.getState().user?.id;
      const trips = useTripStore.getState().trips;

      set({
        isCalculating: false,
        balancesByTrip,
        ...membersPatch,
        unsettledCountByTrip: deriveUnsettledCounts(balancesByTrip),
        aggregateSummary: deriveAggregateSummary(
          userId,
          trips,
          balancesByTrip
        ),
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

    const balancesByTrip = {
      ...get().balancesByTrip,
      [tripId]: { netPositions, simplifiedDebts, memberBalances },
    };
    const userId = useAuthStore.getState().user?.id;
    const trips = useTripStore.getState().trips;

    set({
      isCalculating: false,
      balancesByTrip,
      ...membersPatch,
      unsettledCountByTrip: deriveUnsettledCounts(balancesByTrip),
      aggregateSummary: deriveAggregateSummary(userId, trips, balancesByTrip),
    });
  },

  fetchAllTripBalances: async (userId) => {
    const trips = useTripStore.getState().trips;
    if (trips.length === 0) {
      set({
        isFetchingAll: false,
        aggregateSummary: EMPTY_AGGREGATE,
        unsettledCountByTrip: {},
      });
      return;
    }

    set({ isFetchingAll: true });

    try {
      await Promise.all(
        trips.map(async (trip) => {
          const expenseStore = useExpenseStore.getState();
          if (!(trip.id in expenseStore.expensesByTrip)) {
            await expenseStore.fetchExpenses(trip.id);
          }

          const members = await fetchMembersForTrip(trip.id).catch(() => []);
          get().recomputeBalances(trip.id, members);
        })
      );
    } finally {
      set({ isFetchingAll: false });
    }
  },

  clearBalanceState: () =>
    set({
      balancesByTrip: {},
      settlementsByTrip: {},
      aggregateSummary: EMPTY_AGGREGATE,
      unsettledCountByTrip: {},
      membersByTrip: {},
      isCalculating: false,
      isFetchingAll: false,
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

export const useAggregateSummary = () =>
  useBalanceStore((s) => s.aggregateSummary);

export const useUnsettledCountByTrip = () =>
  useBalanceStore((s) => s.unsettledCountByTrip);

export const useBalanceMembersByTrip = () =>
  useBalanceStore((s) => s.membersByTrip);

export const useBalancesFetchingAll = () =>
  useBalanceStore((s) => s.isFetchingAll);

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
  useBalanceStore((s) => s.isCalculating || s.isFetchingAll);
