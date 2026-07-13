"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useAddToast,
  usePendingInvite,
  useTripStore,
  useUser,
} from "@/store";
import { useAuthStore } from "@/store/authStore";

const RESOLVED_INVITE_KEY = "tally_pending_invite_resolved";

function readResolvedToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(RESOLVED_INVITE_KEY);
  } catch {
    return null;
  }
}

function markInviteResolved(token: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RESOLVED_INVITE_KEY, token);
  } catch {
    // ignore
  }
}

/** User-initiated deep links — never hijack these with invite auto-redirect. */
function isProtectedDeepLink(pathname: string): boolean {
  return (
    pathname.startsWith("/balances") ||
    /^\/trips\/[^/]+\/(balances|settlements|expenses|invite)/.test(pathname)
  );
}

/**
 * After auth + onboarding, auto-join any trip saved from a logged-out invite link.
 * Call once from the authenticated app layout.
 */
export function useResolvePendingInvite() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const pendingToken = usePendingInvite();
  const joinTripViaToken = useTripStore((s) => s.joinTripViaToken);
  const clearPendingInvite = useTripStore((s) => s.clearPendingInvite);
  const addToast = useAddToast();
  const inFlightRef = useRef(false);
  const routerRef = useRef(router);
  routerRef.current = router;

  const userId = user?.id;
  const onboardingComplete = user?.onboardingComplete ?? false;

  useEffect(() => {
    if (!userId || !onboardingComplete || !pendingToken) return;
    if (isProtectedDeepLink(pathname)) return;
    if (readResolvedToken() === pendingToken) {
      clearPendingInvite();
      return;
    }
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    let cancelled = false;

    (async () => {
      const token = pendingToken;
      const authUser = useAuthStore.getState().user;
      if (!authUser || authUser.id !== userId) return;

      try {
        const result = await joinTripViaToken(token, authUser);
        if (cancelled) return;

        markInviteResolved(token);
        clearPendingInvite();

        if (!result.ok) {
          addToast({
            message:
              "This invite link isn't valid. Ask your trip organizer for a new one.",
            variant: "error",
          });
          return;
        }

        if (result.isNewMember) {
          addToast({
            message: `You joined ${result.trip.name}`,
            variant: "success",
          });
          routerRef.current.replace(`/trips/${result.trip.id}`);
        }
      } catch {
        if (cancelled) return;
        markInviteResolved(token);
        clearPendingInvite();
        addToast({
          message: "Couldn't join the trip. Please try again.",
          variant: "error",
        });
      } finally {
        if (!cancelled) inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
  }, [
    userId,
    onboardingComplete,
    pendingToken,
    pathname,
    joinTripViaToken,
    clearPendingInvite,
    addToast,
  ]);
}

export function PendingInviteResolver() {
  useResolvePendingInvite();
  return null;
}
