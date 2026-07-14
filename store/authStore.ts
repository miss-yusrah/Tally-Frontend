import { create } from "zustand";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  homeCurrency: string;
  avatarUrl?: string;
  onboardingComplete: boolean;
}

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  isUpdatingProfile: boolean;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  clearUser: () => void;
  completeOnboarding: (displayName: string, homeCurrency: string) => void;
  updateDisplayName: (displayName: string) => Promise<boolean>;
  updateHomeCurrency: (homeCurrency: string) => Promise<boolean>;
}

async function patchUserProfile(body: {
  displayName?: string;
  homeCurrency?: string;
}): Promise<AuthUser | null> {
  const res = await fetch("/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as
    | { ok: true; user: AuthUser }
    | { ok: false; reason?: string }
    | null;

  if (!res.ok || !data || !("ok" in data) || !data.ok) {
    return null;
  }

  return data.user;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  isUpdatingProfile: false,
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),
  setStatus: (status) => set({ status }),
  clearUser: () => set({ user: null, status: "unauthenticated" }),
  completeOnboarding: (displayName, homeCurrency) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, displayName, homeCurrency, onboardingComplete: true }
        : null,
    })),

  updateDisplayName: async (displayName) => {
    const trimmed = displayName.trim();
    if (!get().user || trimmed.length < 2) return false;

    set({ isUpdatingProfile: true });
    try {
      const updated = await patchUserProfile({ displayName: trimmed });
      if (!updated) return false;

      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              displayName: updated.displayName,
              homeCurrency: updated.homeCurrency || state.user.homeCurrency,
              avatarUrl: updated.avatarUrl ?? state.user.avatarUrl,
            }
          : null,
      }));
      return true;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updateHomeCurrency: async (homeCurrency) => {
    const code = homeCurrency.trim().toUpperCase();
    if (!get().user || !code) return false;

    set({ isUpdatingProfile: true });
    try {
      const updated = await patchUserProfile({ homeCurrency: code });
      if (!updated) return false;

      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              displayName: updated.displayName || state.user.displayName,
              homeCurrency: updated.homeCurrency,
              avatarUrl: updated.avatarUrl ?? state.user.avatarUrl,
            }
          : null,
      }));
      return true;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}));

export const useUser = () => useAuthStore((s) => s.user);
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useIsAuthenticated = () =>
  useAuthStore((s) => s.status === "authenticated");
export const useAuthLoading = () =>
  useAuthStore((s) => s.status === "loading" || s.status === "idle");
export const useHomeCurrency = () =>
  useAuthStore((s) => s.user?.homeCurrency ?? "USD");
export const useIsUpdatingProfile = () =>
  useAuthStore((s) => s.isUpdatingProfile);
