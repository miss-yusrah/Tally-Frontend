import { create } from "zustand";
import type { CreateTripInput, Trip, TripMember } from "@/types";
import type { AuthUser } from "@/store/authStore";
import { generateId, generateInviteToken } from "@/lib/utils";
import {
  persistTrip,
  joinTripViaToken as joinTripViaTokenDb,
  fetchTripsForUser,
  fetchTripDetail as fetchTripDetailDb,
  type JoinTripResult,
} from "@/lib/db/trips";
import { useBalanceStore } from "@/store/balanceStore";

const PENDING_INVITE_KEY = "tally_pending_invite";

function readPendingInvite(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const fromSession = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (fromSession) return fromSession;
  } catch {
    // sessionStorage can throw in private mode / blocked storage
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${PENDING_INVITE_KEY}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writePendingInvite(token: string) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // ignore
  }

  document.cookie = `${PENDING_INVITE_KEY}=${encodeURIComponent(
    token
  )}; path=/; max-age=1800; samesite=lax`;
}

function deletePendingInvite() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // ignore
  }

  document.cookie = `${PENDING_INVITE_KEY}=; path=/; max-age=0; samesite=lax`;
}

interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  members: TripMember[];
  isLoading: boolean;
  pendingInviteToken: string | null;
  setTrips: (trips: Trip[]) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setMembers: (members: TripMember[]) => void;
  addTrip: (trip: Trip) => void;
  setLoading: (loading: boolean) => void;
  createTrip: (input: CreateTripInput, user: AuthUser) => Promise<Trip>;
  fetchTrips: (user: AuthUser) => Promise<void>;
  fetchTripDetail: (
    tripId: string,
    options?: { silent?: boolean }
  ) => Promise<Trip | null>;
  joinTripViaToken: (token: string, user: AuthUser) => Promise<JoinTripResult>;
  setPendingInvite: (token: string) => void;
  clearPendingInvite: () => void;
  clearTripState: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  activeTrip: null,
  members: [],
  isLoading: false,
  pendingInviteToken: readPendingInvite(),
  setTrips: (trips) => set({ trips }),
  setActiveTrip: (activeTrip) => set({ activeTrip }),
  setMembers: (members) => set({ members }),
  addTrip: (trip) => set((state) => ({ trips: [trip, ...state.trips] })),
  setLoading: (isLoading) => set({ isLoading }),
  createTrip: async (input, user) => {
    const now = new Date().toISOString();
    const trip: Trip = {
      id: generateId(),
      name: input.name.trim(),
      destination: input.destination.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      baseCurrency: input.baseCurrency,
      baseCurrencyLockedAt: null,
      inviteToken: generateInviteToken(),
      createdBy: user.id,
      createdAt: now,
    };

    const organizer: TripMember = {
      userId: user.id,
      tripId: trip.id,
      displayName: user.displayName || user.email,
      avatarUrl: user.avatarUrl,
      role: "organizer",
      joinedAt: now,
    };

    set((state) => ({
      trips: [trip, ...state.trips],
      activeTrip: trip,
      members: [organizer],
    }));

    await persistTrip(trip, organizer);

    return trip;
  },
  fetchTrips: async (user) => {
    set({ isLoading: true });
    try {
      const trips = await fetchTripsForUser(user.id);
      set({ trips, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch trips:", error);
      set({ isLoading: false });
    }
  },
  fetchTripDetail: async (tripId, options) => {
    const silent = options?.silent ?? false;
    if (!silent) set({ isLoading: true });
    try {
      const { trip, members } = await fetchTripDetailDb(tripId);
      if (trip) {
        set((state) => ({
          activeTrip: trip,
          members,
          isLoading: false,
          trips: state.trips.some((t) => t.id === trip.id)
            ? state.trips
            : [trip, ...state.trips],
        }));
      } else {
        set({ members, isLoading: false });
      }
      if (members.length > 0) {
        useBalanceStore.getState().recomputeBalances(tripId);
      }
      return trip;
    } catch (error) {
      console.error("Failed to fetch trip detail:", error);
      set({ isLoading: false });
      return null;
    }
  },
  joinTripViaToken: async (token, user) => {
    const result = await joinTripViaTokenDb(token, user);
    if (result.ok) {
      set((state) => {
        const hasTrip = state.trips.some((t) => t.id === result.trip.id);
        return {
          trips: hasTrip ? state.trips : [result.trip, ...state.trips],
          activeTrip: result.trip,
          members: result.members,
        };
      });
    }
    return result;
  },
  setPendingInvite: (token) => {
    writePendingInvite(token);
    set({ pendingInviteToken: token });
  },
  clearPendingInvite: () => {
    deletePendingInvite();
    set({ pendingInviteToken: null });
  },
  clearTripState: () =>
    set({ trips: [], activeTrip: null, members: [], isLoading: false }),
}));

export const useTrips = () => useTripStore((s) => s.trips);
export const useActiveTrip = () => useTripStore((s) => s.activeTrip);
export const useTripMembers = () => useTripStore((s) => s.members);
export const useTripsLoading = () => useTripStore((s) => s.isLoading);
export const usePendingInvite = () =>
  useTripStore((s) => s.pendingInviteToken);
