"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const DEFAULT_AVATAR = "/tabr/home/avatars/21.webp";

interface HomeNotificationsBellProps {
  unreadCount: number;
  ringOffsetClass?: string;
}

export function HomeNotificationsBell({
  unreadCount,
  ringOffsetClass = "focus-visible:ring-offset-white",
}: HomeNotificationsBellProps) {
  return (
    <Link
      href="/notifications"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full",
        "transition-colors hover:bg-[#F6F4FB]",
        focusRing,
        ringOffsetClass
      )}
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tabr/home/icons/bell.webp"
        alt=""
        width={24}
        height={24}
        className="h-6 w-6"
        aria-hidden
      />
      {unreadCount > 0 ? (
        <span
          className={cn(
            "absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center",
            "rounded-full bg-[#F43F5E] px-1 text-[10px] font-bold text-white"
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

interface HomeProfileAvatarLinkProps {
  avatarUrl?: string;
  ringOffsetClass?: string;
}

export function HomeProfileAvatarLink({
  avatarUrl,
  ringOffsetClass = "focus-visible:ring-offset-white",
}: HomeProfileAvatarLinkProps) {
  return (
    <Link
      href="/profile"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full aspect-square",
        focusRing,
        ringOffsetClass
      )}
      aria-label="Profile"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl || DEFAULT_AVATAR}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 rounded-full object-cover"
      />
    </Link>
  );
}
