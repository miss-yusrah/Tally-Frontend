"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { useBalanceStore } from "@/store/balanceStore";
import { useCloseBottomSheet } from "@/store";
import { useExpenseStore } from "@/store/expenseStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettlementStore } from "@/store/settlementStore";
import { useTripStore } from "@/store/tripStore";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13131A]";

async function signOutAndClear() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  useAuthStore.getState().clearUser();
  useTripStore.getState().clearTripState();
  useTripStore.getState().clearPendingInvite();
  useExpenseStore.getState().clearExpenses();
  useBalanceStore.getState().clearBalanceState();
  useSettlementStore.getState().clearSettlementState();
  useNotificationStore.getState().clearNotificationState();
}

export function SignOutConfirmSheet() {
  const router = useRouter();
  const closeBottomSheet = useCloseBottomSheet();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOutAndClear();
      closeBottomSheet();
      router.refresh();
      router.push("/");
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-1 pb-2 pt-1">
      <h2 className="text-center text-[17px] font-semibold text-[#F8F8FF]">
        Sign out?
      </h2>
      <p className="mt-2 max-w-[280px] text-center text-[14px] font-normal leading-relaxed text-[#94A3B8]">
        You&apos;ll need to sign in again to access your trips.
      </p>

      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={busy}
        className={cn(
          "mt-6 flex h-14 w-full items-center justify-center rounded-[12px]",
          "bg-[#F43F5E] text-[16px] font-semibold text-[#F8F8FF]",
          "transition-all duration-fast ease-tally active:scale-[0.98]",
          "disabled:opacity-60",
          focusRing
        )}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>

      <button
        type="button"
        onClick={closeBottomSheet}
        disabled={busy}
        className={cn(
          "mt-3 flex h-11 w-full items-center justify-center",
          "text-[15px] font-medium text-[#94A3B8]",
          "transition-colors duration-fast ease-tally hover:text-[#F8F8FF]",
          focusRing
        )}
      >
        Cancel
      </button>
    </div>
  );
}
