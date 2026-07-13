import { create } from "zustand";
import {
  computeNetBalances,
  simplifyDebts,
} from "@/lib/debt-simplification";
import { fetchMembersForTrip } from "@/lib/db/members";
import { useAuthStore } from "@/store/authStore";
import { useExpenseStore } from "@/store/expenseStore";
import { useTripStore } from "@/store/tripStore";
import type { Settlement } from "@/types";

/** Lazy access breaks balanceStore ↔ settlementStore circular import at init. */
function getSettlementStoreState() {
  const { useSettlementStore } =
    require("@/store/settlementStore") as typeof import("@/store/settlementStore");
  return useSettlementStore.getState();
}
import type {
  Balance,
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
  /** MVP: raw minor-unit sums across trips — displayed in homeCurrency without FX conversion. */
  aggregateSummary: AggregateSummary;
  unsettledCountByTrip: Record<string, number>;
  membersByTrip: Record<string, TripMember[]>;
  isCalculating: boolean;
  isFetchingAll: boolean;
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
const EMPTY_DEBTS: SimplifiedPayment[] = [];
const EMPTY_MEMBER_BALANCES: Balance[] = [];

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

function snapshotsEqual(
  a: TripBalanceSnapshot | undefined,
  b: TripBalanceSnapshot
): boolean {
  if (!a) return false;
  return (
    JSON.stringify(a.netPositions) === JSON.stringify(b.netPositions) &&
    JSON.stringify(a.simplifiedDebts) === JSON.stringify(b.simplifiedDebts) &&
    JSON.stringify(a.memberBalances) === JSON.stringify(b.memberBalances)
  );
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balancesByTrip: {},
  aggregateSummary: EMPTY_AGGREGATE,
  unsettledCountByTrip: {},
  membersByTrip: {},
  isCalculating: false,
  isFetchingAll: false,

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

    const settlements: Settlement[] =
      getSettlementStoreState().settlementsByTrip[tripId] ?? [];

    const membersPatch =
      membersOverride?.length || members.length
        ? (() => {
            const existing = get().membersByTrip[tripId];
            const unchanged =
              existing?.length === members.length &&
              existing.every((m, i) => m.userId === members[i]?.userId);
            if (unchanged) return {};
            return {
              membersByTrip: {
                ...get().membersByTrip,
                ...(members.length ? { [tripId]: members } : {}),
              },
            };
          })()
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
      settlements
        .filter((s) => !s._optimistic)
        .map((s) => ({
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

    const snapshot = { netPositions, simplifiedDebts, memberBalances };

    const balancesByTrip = {
      ...get().balancesByTrip,
      [tripId]: snapshot,
    };
    const userId = useAuthStore.getState().user?.id;
    const trips = useTripStore.getState().trips;

    const nextUnsettled = deriveUnsettledCounts(balancesByTrip);
    const nextAggregate = deriveAggregateSummary(userId, trips, balancesByTrip);
    const prev = get();

    const balancesUnchanged = snapshotsEqual(prev.balancesByTrip[tripId], snapshot);
    const unsettledUnchanged =
      JSON.stringify(prev.unsettledCountByTrip) === JSON.stringify(nextUnsettled);
    const aggregateUnchanged =
      prev.aggregateSummary.totalOwed === nextAggregate.totalOwed &&
      prev.aggregateSummary.totalOwing === nextAggregate.totalOwing;
    const membersUnchanged = Object.keys(membersPatch).length === 0;

    if (
      balancesUnchanged &&
      unsettledUnchanged &&
      aggregateUnchanged &&
      membersUnchanged
    ) {
      if (prev.isCalculating) {
        set({ isCalculating: false });
      }
      return;
    }

    set({
      isCalculating: false,
      balancesByTrip,
      ...membersPatch,
      unsettledCountByTrip: nextUnsettled,
      aggregateSummary: nextAggregate,
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

          await getSettlementStoreState().fetchSettlementHistory(trip.id);

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
  useBalanceStore((s) => s.balancesByTrip[tripId]?.simplifiedDebts ?? EMPTY_DEBTS);

export const useTripMemberBalances = (tripId: string) =>
  useBalanceStore((s) => s.balancesByTrip[tripId]?.memberBalances ?? EMPTY_MEMBER_BALANCES);

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

export const useBalancesLoading = () =>
  useBalanceStore((s) => s.isCalculating || s.isFetchingAll);
