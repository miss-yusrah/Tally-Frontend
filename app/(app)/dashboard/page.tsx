"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { useAuthSession } from "@/features/auth";
import { Spinner } from "@/components/ui/Spinner";
import { TripCard } from "@/components/shared/TripCard";
import { fetchMembersForTrip } from "@/lib/db/members";
import { getTimeGreeting } from "@/lib/greeting";
import { partitionTripsByStatus } from "@/lib/trips";
import {
  useNotificationStore,
  useTripStore,
  useTrips,
  useTripsLoading,
  useUnreadCount,
} from "@/store";
import { cn } from "@/lib/utils";
import type { TripMember } from "@/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

function SectionLabel({
  tone,
  children,
}: {
  tone: "active" | "past";
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "active" ? "bg-[#10B981]" : "bg-[#475569]"
        )}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
        {children}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-16 pt-10 text-center">
      <div
        className={cn(
          "flex h-24 w-24 items-center justify-center rounded-[24px]",
          "border border-[#ffffff0f] bg-[#13131A]",
          "shadow-[inset_0_1px_0_#ffffff0a]"
        )}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient
              id="empty-icon-grad"
              x1="4"
              y1="4"
              x2="36"
              y2="36"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          {/* Suitcase body */}
          <rect
            x="6"
            y="14"
            width="28"
            height="20"
            rx="4"
            stroke="url(#empty-icon-grad)"
            strokeWidth="1.75"
          />
          {/* Handle */}
          <path
            d="M15 14V11a5 5 0 0 1 10 0v3"
            stroke="url(#empty-icon-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          {/* Latch line */}
          <path
            d="M6 22h28"
            stroke="url(#empty-icon-grad)"
            strokeWidth="1.75"
            opacity="0.55"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-[19px] font-bold text-[#F8F8FF]">No trips yet</h2>
      <p className="mt-1.5 max-w-[260px] text-[14px] font-normal leading-[1.5] text-[#94A3B8]">
        Tap &apos;New trip&apos; to start splitting with your crew.
      </p>
    </div>
  );
}

function ProfileAvatar({
  name,
  src,
}: {
  name: string;
  src?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="h-10 w-10 rounded-full object-cover border-2 border-[#ffffff1a]"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#ffffff1a] bg-[#1C1C27] text-[13px] font-semibold text-[#F8F8FF]"
      aria-label={name}
    >
      {initials || "?"}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthSession();
  const trips = useTrips();
  const isLoading = useTripsLoading();
  const fetchTrips = useTripStore((s) => s.fetchTrips);
  const unreadCount = useUnreadCount();
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const [membersByTrip, setMembersByTrip] = useState<
    Record<string, TripMember[]>
  >({});

  useEffect(() => {
    if (user?.onboardingComplete) {
      void fetchTrips(user);
    }
  }, [user?.id, user?.onboardingComplete, fetchTrips, user]);

  useEffect(() => {
    if (!user?.id || !user.onboardingComplete) return;
    void fetchNotifications(user.id);
  }, [user?.id, user?.onboardingComplete, fetchNotifications]);

  // Soft-load member faces for the avatar stacks — non-blocking.
  useEffect(() => {
    if (trips.length === 0) return;
    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        trips.map(async (trip) => {
          const members = await fetchMembersForTrip(trip.id).catch(() => []);
          return [trip.id, members] as const;
        })
      );
      if (cancelled) return;
      setMembersByTrip(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [trips]);

  const { active, past } = useMemo(
    () => partitionTripsByStatus(trips),
    [trips]
  );

  const displayName = user?.displayName || "there";
  const firstName = displayName.split(" ")[0];
  const greeting = getTimeGreeting();

  let enterIndex = 0;
  const stagger = () => ({
    animationDelay: `${Math.min(enterIndex++ * 40, 320)}ms`,
  });

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Ambient glow — landing-screen signature, behind all content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle 320px at 195px 80px, rgba(124, 58, 237, 0.12), transparent 70%)",
        }}
      />

      {/* Header — transparent over the glow, no surface/border */}
      <header className="relative z-30 flex items-center justify-between px-6 pb-4 pt-4 safe-top">
        <div className="min-w-0">
          <p className="text-[15px] font-normal text-[#94A3B8]">
            {greeting},
          </p>
          <h1 className="truncate text-[26px] font-bold tracking-[-0.01em] text-[#F8F8FF]">
            {firstName}
          </h1>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <Link
            href="/notifications"
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
              "transition-colors hover:bg-[#1C1C27]",
              focusRing
            )}
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
            {unreadCount > 0 ? (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center",
                  "rounded-full bg-[#F43F5E] px-1 text-[10px] font-bold text-white"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/profile"
            className={cn("rounded-full", focusRing)}
            aria-label="Profile"
          >
            <ProfileAvatar name={displayName} src={user?.avatarUrl} />
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col px-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Primary CTA — always present */}
            <Link
              href="/trips/new"
              style={stagger()}
              className={cn(
                "animate-dashboard-item-enter mt-4",
                "flex h-14 w-full items-center justify-center gap-2 rounded-[14px]",
                "bg-accent-gradient text-[16px] font-semibold text-[#F8F8FF]",
                "shadow-[0_0_24px_#7C3AED50]",
                "transition-all duration-fast ease-tally",
                "active:scale-[0.97] active:shadow-[0_0_32px_#7C3AED70]",
                focusRing
              )}
            >
              <Plus className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
              New trip
            </Link>

            {trips.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col pb-8">
                {active.length > 0 && (
                  <section className="mt-5" aria-label="Active trips">
                    <div
                      style={stagger()}
                      className="animate-dashboard-item-enter"
                    >
                      <SectionLabel tone="active">Active</SectionLabel>
                    </div>
                    <div className="flex flex-col gap-3">
                      {active.map((trip) => (
                        <div
                          key={trip.id}
                          style={stagger()}
                          className="animate-dashboard-item-enter"
                        >
                          <TripCard
                            trip={trip}
                            variant="active"
                            members={membersByTrip[trip.id]}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {past.length > 0 && (
                  <section className="mt-5" aria-label="Past trips">
                    <div
                      style={stagger()}
                      className="animate-dashboard-item-enter"
                    >
                      <SectionLabel tone="past">Past</SectionLabel>
                    </div>
                    <div className="flex flex-col gap-3">
                      {past.map((trip) => (
                        <div
                          key={trip.id}
                          style={stagger()}
                          className="animate-dashboard-item-enter"
                        >
                          <TripCard
                            trip={trip}
                            variant="past"
                            members={membersByTrip[trip.id]}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
