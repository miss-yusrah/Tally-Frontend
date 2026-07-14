"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapSupabaseUser } from "@/lib/supabase/profile";
import { useAuthStore } from "@/store/authStore";
import { useBalanceStore } from "@/store/balanceStore";
import { useExpenseStore } from "@/store/expenseStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettlementStore } from "@/store/settlementStore";
import { useTripStore } from "@/store/tripStore";

function clearAllAppStores() {
  useAuthStore.getState().clearUser();
  useTripStore.getState().clearTripState();
  useTripStore.getState().clearPendingInvite();
  useExpenseStore.getState().clearExpenses();
  useBalanceStore.getState().clearBalanceState();
  useSettlementStore.getState().clearSettlementState();
  useNotificationStore.getState().clearNotificationState();
}

export function useAuthSession() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const storeStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const supabase = useMemo(() => {
    if (!isSupabaseConfigured()) return null;
    return createClient();
  }, []);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    setStatus("loading");

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? mapSupabaseUser(data.user) : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, setUser, setStatus]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearAllAppStores();
    router.refresh();
    router.push("/");
  }, [supabase, router]);

  return {
    user,
    status: storeStatus,
    isAuthenticated: storeStatus === "authenticated",
    isLoading: storeStatus === "loading" || storeStatus === "idle",
    signOut,
  };
}

export function AuthSessionHydrator() {
  useAuthSession();
  return null;
}
