import { create } from "zustand";
import {
  buildSettlementRecord,
  fetchSettlementByToken,
  fetchSettlementsForTrip,
  persistSettlement,
  SettlementDuplicateError,
} from "@/lib/db/settlements";
import { useTripStore } from "@/store/tripStore";
import { useUIStore } from "@/store/uiStore";
import type { Settlement, SimplifiedPayment } from "@/types";

/** Lazy access breaks balanceStore ↔ settlementStore circular import at init. */
function getBalanceStoreState() {
  const { useBalanceStore } =
    require("@/store/balanceStore") as typeof import("@/store/balanceStore");
  return useBalanceStore.getState();
}

const EMPTY_SETTLEMENTS: Settlement[] = [];
const EMPTY_SETTLING_KEYS: string[] = [];

/** Stable key for a simplified debt row / settling transient state. */
export function settlementPaymentKey(payment: SimplifiedPayment): string {
  return `${payment.fromUserId}-${payment.toUserId}-${payment.amountMinorUnits}`;
}

interface SettlementState {
  settlementsByTrip: Record<string, Settlement[]>;
  /** Transient "settling…" keys per trip while confirm is in flight. */
  settlingKeysByTrip: Record<string, string[]>;
  isLoading: boolean;
  fetchSettlementHistory: (tripId: string) => Promise<void>;
  confirmSettlement: (params: {
    tripId: string;
    payment: SimplifiedPayment;
    currency: string;
    confirmedBy: string;
    idempotencyToken: string;
  }) => Promise<boolean>;
  clearSettlementState: () => void;
}

function paymentStillOutstanding(
  tripId: string,
  payment: SimplifiedPayment
): boolean {
  const debts =
    getBalanceStoreState().balancesByTrip[tripId]?.simplifiedDebts ?? [];
  const key = settlementPaymentKey(payment);
  return debts.some((d) => settlementPaymentKey(d) === key);
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlementsByTrip: {},
  settlingKeysByTrip: {},
  isLoading: false,

  fetchSettlementHistory: async (tripId) => {
    set({ isLoading: true });
    try {
      const settlements = await fetchSettlementsForTrip(tripId);
      set((state) => ({
        settlementsByTrip: {
          ...state.settlementsByTrip,
          [tripId]: settlements,
        },
        isLoading: false,
      }));
      // Balances page reacts to settlementKey and calls recomputeBalances.
    } catch (error) {
      console.error("Failed to fetch settlement history:", error);
      set({ isLoading: false });
    }
  },

  confirmSettlement: async ({
    tripId,
    payment,
    currency,
    confirmedBy,
    idempotencyToken,
  }) => {
    if (confirmedBy !== payment.fromUserId) {
      return false;
    }

    if (!paymentStillOutstanding(tripId, payment)) {
      useUIStore.getState().addToast({
        message: "This payment is no longer outstanding.",
        variant: "warning",
      });
      return false;
    }

    const key = settlementPaymentKey(payment);

    const optimistic = buildSettlementRecord({
      tripId,
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amountMinorUnits: payment.amountMinorUnits,
      currency,
      confirmedBy,
      idempotencyToken,
    });
    optimistic._optimistic = true;

    set((state) => ({
      settlingKeysByTrip: {
        ...state.settlingKeysByTrip,
        [tripId]: [...(state.settlingKeysByTrip[tripId] ?? []), key],
      },
    }));

    try {
      let saved: Settlement;

      try {
        saved = await persistSettlement(optimistic);
      } catch (error) {
        if (error instanceof SettlementDuplicateError) {
          const existing = await fetchSettlementByToken(idempotencyToken);
          if (existing) {
            saved = existing;
          } else {
            await get().fetchSettlementHistory(tripId);
            set((state) => ({
              settlingKeysByTrip: {
                ...state.settlingKeysByTrip,
                [tripId]: (state.settlingKeysByTrip[tripId] ?? []).filter(
                  (k) => k !== key
                ),
              },
            }));
            getBalanceStoreState().recomputeBalances(tripId);
            return true;
          }
        } else {
          throw error;
        }
      }

      set((state) => ({
        settlementsByTrip: {
          ...state.settlementsByTrip,
          [tripId]: [
            saved,
            ...(state.settlementsByTrip[tripId] ?? []).filter(
              (s) => s.id !== optimistic.id
            ),
          ],
        },
        settlingKeysByTrip: {
          ...state.settlingKeysByTrip,
          [tripId]: (state.settlingKeysByTrip[tripId] ?? []).filter(
            (k) => k !== key
          ),
        },
      }));

      const trip = useTripStore.getState().trips.find((t) => t.id === tripId);
      if (trip) {
        getBalanceStoreState().recomputeBalances(tripId);
      }

      return true;
    } catch (error) {
      console.error("Failed to confirm settlement:", error);
      set((state) => ({
        settlingKeysByTrip: {
          ...state.settlingKeysByTrip,
          [tripId]: (state.settlingKeysByTrip[tripId] ?? []).filter(
            (k) => k !== key
          ),
        },
      }));
      useUIStore.getState().addToast({
        message: "Couldn't record the settlement. Please try again.",
        variant: "error",
      });
      return false;
    }
  },

  clearSettlementState: () =>
    set({
      settlementsByTrip: {},
      settlingKeysByTrip: {},
      isLoading: false,
    }),
}));

export const useSettlementsForTrip = (tripId: string) =>
  useSettlementStore((s) => s.settlementsByTrip[tripId] ?? EMPTY_SETTLEMENTS);

export const useSettlingKeysForTrip = (tripId: string) =>
  useSettlementStore((s) => s.settlingKeysByTrip[tripId] ?? EMPTY_SETTLING_KEYS);

export const useSettlementsLoading = () =>
  useSettlementStore((s) => s.isLoading);

/** @deprecated use useSettlementsForTrip(tripId) */
export const useSettlements = () =>
  useSettlementStore((s) => Object.values(s.settlementsByTrip).flat());
