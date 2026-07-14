import { create } from "zustand";
import type { AddExpenseInput, Expense, ExpenseCategory } from "@/types";
import {
  buildExpenseRecord,
  fetchExpenseById,
  fetchExpensesForTrip,
  persistExpense,
} from "@/lib/db/expenses";
import { generateId } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useBalanceStore } from "@/store/balanceStore";
import { useTripStore } from "@/store/tripStore";
import { useUIStore } from "@/store/uiStore";

/**
 * The DB trigger locks the trip's base currency when its first expense lands.
 * Mirror that into client trip state so the app never thinks it's unlocked.
 */
function mirrorBaseCurrencyLock(tripId: string, lockedAt: string) {
  useTripStore.setState((state) => {
    const lock = (trip: typeof state.activeTrip) =>
      trip && trip.id === tripId && !trip.baseCurrencyLockedAt
        ? { ...trip, baseCurrencyLockedAt: lockedAt }
        : trip;
    return {
      activeTrip: lock(state.activeTrip),
      trips: state.trips.map((t) => lock(t)!),
    };
  });
}

/** Data handed from the receipt-scan flow to the Add Expense form. */
export interface ScanPrefill {
  totalAmount: number | null;
  currency: string | null;
  category: ExpenseCategory | null;
  merchantName: string | null;
  receiptImageUrl: string | null;
  failed: boolean;
}

interface ExpenseState {
  expensesByTrip: Record<string, Expense[]>;
  isLoading: boolean;
  isAddingExpense: boolean;
  prefill: ScanPrefill | null;
  setExpensesForTrip: (tripId: string, expenses: Expense[]) => void;
  fetchExpenses: (tripId: string) => Promise<void>;
  getExpense: (tripId: string, expenseId: string) => Promise<Expense | null>;
  addExpense: (
    tripId: string,
    data: AddExpenseInput,
    options: { baseCurrency: string; createdBy: string }
  ) => Expense;
  setPrefillData: (prefill: ScanPrefill) => void;
  clearPrefill: () => void;
  removeExpenseFromTrip: (tripId: string, expenseId: string) => void;
  clearExpenses: () => void;
}

const EMPTY_EXPENSES: Expense[] = [];

function getTripExpenses(state: ExpenseState, tripId: string): Expense[] {
  return state.expensesByTrip[tripId] ?? EMPTY_EXPENSES;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expensesByTrip: {},
  isLoading: false,
  isAddingExpense: false,
  prefill: null,

  setPrefillData: (prefill) => set({ prefill }),
  clearPrefill: () => set({ prefill: null }),

  setExpensesForTrip: (tripId, expenses) =>
    set((state) => ({
      expensesByTrip: { ...state.expensesByTrip, [tripId]: expenses },
    })),

  fetchExpenses: async (tripId) => {
    set({ isLoading: true });
    try {
      const expenses = await fetchExpensesForTrip(tripId);
      set((state) => ({
        expensesByTrip: { ...state.expensesByTrip, [tripId]: expenses },
        isLoading: false,
      }));
      useBalanceStore.getState().recomputeBalances(tripId);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      set({ isLoading: false });
    }
  },

  getExpense: async (tripId, expenseId) => {
    const cached = getTripExpenses(get(), tripId).find((e) => e.id === expenseId);
    if (cached) {
      // Still try to hydrate from server in background when optimistic
      if (cached._optimistic) {
        void fetchExpenseById(tripId, expenseId).then((expense) => {
          if (!expense) return;
          set((state) => ({
            expensesByTrip: {
              ...state.expensesByTrip,
              [tripId]: getTripExpenses(state, tripId).map((e) =>
                e.id === expense.id ? expense : e
              ),
            },
          }));
        });
      }
      return cached;
    }

    const expense = await fetchExpenseById(tripId, expenseId);
    if (expense) {
      set((state) => {
        const existing = getTripExpenses(state, tripId);
        const has = existing.some((e) => e.id === expense.id);
        return {
          expensesByTrip: {
            ...state.expensesByTrip,
            [tripId]: has
              ? existing.map((e) => (e.id === expense.id ? expense : e))
              : [expense, ...existing],
          },
        };
      });
    }
    return expense;
  },

  addExpense: (tripId, data, options) => {
    // Stable UUID so trip list + detail links work before persist resolves.
    const id = generateId();
    const optimistic = buildExpenseRecord({
      ...data,
      tripId,
      baseCurrency: options.baseCurrency,
      createdBy: options.createdBy,
      id,
    });
    optimistic._optimistic = true;

    set((state) => ({
      isAddingExpense: true,
      expensesByTrip: {
        ...state.expensesByTrip,
        [tripId]: [optimistic, ...getTripExpenses(state, tripId)],
      },
    }));

    useBalanceStore.getState().recomputeBalances(tripId);

    void (async () => {
      try {
        const tripState = useTripStore.getState();
        const trip =
          tripState.activeTrip?.id === tripId
            ? tripState.activeTrip
            : tripState.trips.find((t) => t.id === tripId);
        const membersFromTrip =
          tripState.activeTrip?.id === tripId ? tripState.members : [];
        const members =
          useBalanceStore.getState().membersByTrip[tripId] ??
          membersFromTrip;
        const authUser = useAuthStore.getState().user;
        const actorMember = members.find((m) => m.userId === options.createdBy);

        const saved = await persistExpense(
          {
            ...optimistic,
            _optimistic: false,
          },
          trip && authUser
            ? {
                tripName: trip.name,
                members,
                actor: {
                  userId: options.createdBy,
                  displayName:
                    actorMember?.displayName ||
                    authUser.displayName ||
                    authUser.email,
                  avatarUrl: actorMember?.avatarUrl ?? authUser.avatarUrl,
                },
              }
            : undefined
        );

        set((state) => ({
          isAddingExpense: false,
          expensesByTrip: {
            ...state.expensesByTrip,
            [tripId]: getTripExpenses(state, tripId).map((e) =>
              e.id === id ? saved : e
            ),
          },
        }));

        mirrorBaseCurrencyLock(tripId, saved.createdAt);
        useBalanceStore.getState().recomputeBalances(tripId);
      } catch (error) {
        console.error("Failed to save expense:", error);
        set((state) => ({
          isAddingExpense: false,
          expensesByTrip: {
            ...state.expensesByTrip,
            [tripId]: getTripExpenses(state, tripId).filter((e) => e.id !== id),
          },
        }));
        useUIStore.getState().addToast({
          message: "Couldn't save the expense. Please try again.",
          variant: "error",
        });
      }
    })();

    return optimistic;
  },

  removeExpenseFromTrip: (tripId, expenseId) => {
    set((state) => ({
      expensesByTrip: {
        ...state.expensesByTrip,
        [tripId]: getTripExpenses(state, tripId).filter(
          (e) => e.id !== expenseId
        ),
      },
    }));
    useBalanceStore.getState().recomputeBalances(tripId);
  },

  clearExpenses: () =>
    set({
      expensesByTrip: {},
      isLoading: false,
      isAddingExpense: false,
      prefill: null,
    }),
}));

export const useExpensesForTrip = (tripId: string) =>
  useExpenseStore((s) => s.expensesByTrip[tripId] ?? EMPTY_EXPENSES);

export const useExpensesLoadedForTrip = (tripId: string) =>
  useExpenseStore((s) => tripId in s.expensesByTrip);

export const useExpenses = (tripId?: string) =>
  useExpenseStore((s) =>
    tripId ? (s.expensesByTrip[tripId] ?? EMPTY_EXPENSES) : EMPTY_EXPENSES
  );

export const useExpensesLoading = () => useExpenseStore((s) => s.isLoading);
export const useExpenseSubmitting = () =>
  useExpenseStore((s) => s.isAddingExpense);
export const useIsAddingExpense = () =>
  useExpenseStore((s) => s.isAddingExpense);
