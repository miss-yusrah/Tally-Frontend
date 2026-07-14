"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  NotificationCard,
  NotificationsEmptyState,
  NotificationsSkeleton,
  isLocalToday,
  notificationHref,
} from "@/features/notifications";
import {
  useNotificationStore,
  useNotifications,
  useNotificationsLoading,
  useUnreadCount,
  useUser,
} from "@/store";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#475569] first:mt-0">
      {children}
    </p>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const user = useUser();
  const notifications = useNotifications();
  const isLoading = useNotificationsLoading();
  const unreadCount = useUnreadCount();
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markOneRead = useNotificationStore((s) => s.markOneRead);

  const userId = user?.id;

  const refresh = useCallback(() => {
    if (!userId) return;
    void fetchNotifications(userId);
  }, [userId, fetchNotifications]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const { today, earlier } = useMemo(() => {
    const todayList: Notification[] = [];
    const earlierList: Notification[] = [];
    for (const n of notifications) {
      if (isLocalToday(n.createdAt)) todayList.push(n);
      else earlierList.push(n);
    }
    return { today: todayList, earlier: earlierList };
  }, [notifications]);

  const handleOpen = async (notification: Notification) => {
    if (!userId) return;
    await markOneRead(userId, notification.id);
    router.push(notificationHref(notification));
  };

  const handleMarkAll = () => {
    if (!userId || unreadCount === 0) return;
    void markAllRead(userId);
  };

  const showSkeleton = isLoading && notifications.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0A0A0F] pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle 300px at 195px 80px, rgba(124, 58, 237, 0.10), transparent 70%)",
        }}
      />

      <header className="relative z-10 flex items-start justify-between gap-4 px-6 pb-2 pt-4 safe-top">
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#475569]">
            Activity
          </p>
          <h1 className="mt-0.5 text-[28px] font-bold tracking-[-0.01em] text-[#F8F8FF]">
            Notifications
          </h1>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAll}
            className={cn(
              "mt-1 shrink-0 text-[13px] font-medium text-[#7C3AED]",
              "transition-opacity duration-fast ease-tally hover:opacity-80",
              focusRing
            )}
          >
            Mark all read
          </button>
        ) : null}
      </header>

      {unreadCount > 0 ? (
        <div className="relative z-10 px-6 pt-3">
          <span className="inline-flex items-center rounded-full border border-[#7C3AED40] bg-[#7C3AED1a] px-2.5 py-1 text-[12px] font-semibold text-[#7C3AED]">
            {unreadCount} new
          </span>
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 flex-col px-6 pt-4">
        {showSkeleton ? (
          <NotificationsSkeleton />
        ) : notifications.length === 0 ? (
          <NotificationsEmptyState />
        ) : (
          <div className="flex flex-col pb-6">
            {today.length > 0 ? (
              <section aria-label="Today">
                <SectionHeader>Today</SectionHeader>
                <div className="flex flex-col gap-2.5">
                  {today.map((n, i) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      index={i}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {earlier.length > 0 ? (
              <section aria-label="Earlier">
                <SectionHeader>Earlier</SectionHeader>
                <div className="flex flex-col gap-2.5">
                  {earlier.map((n, i) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      index={today.length + i}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
