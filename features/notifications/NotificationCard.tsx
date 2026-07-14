"use client";

import { Check, Receipt, UserPlus } from "lucide-react";
import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import {
  formatNotificationMessage,
  formatNotificationTime,
} from "@/features/notifications/format";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

function TypeBadge({ type }: { type: NotificationType }) {
  const config =
    type === "member_joined"
      ? { bg: "#2563EB", Icon: UserPlus }
      : type === "expense_logged"
        ? { bg: "#7C3AED", Icon: Receipt }
        : { bg: "#10B981", Icon: Check };

  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0A0A0F]"
      style={{ backgroundColor: config.bg }}
      aria-hidden
    >
      <config.Icon className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
    </span>
  );
}

interface NotificationCardProps {
  notification: Notification;
  index: number;
  onOpen: (notification: Notification) => void;
}

export function NotificationCard({
  notification,
  index,
  onOpen,
}: NotificationCardProps) {
  const unread = !notification.read;
  const initial = getMemberInitial(notification.actorName);
  const bg = getAvatarColorForUser(notification.actorId);
  const message = formatNotificationMessage(notification);
  const timeLabel = formatNotificationTime(notification.createdAt);

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
      className={cn(
        "animate-notification-item-enter relative block w-full overflow-hidden rounded-[16px] border border-[#ffffff0f] bg-[#13131A] p-4 text-left",
        "shadow-[inset_0_1px_0_#ffffff0a]",
        "transition-all duration-fast ease-tally",
        "hover:bg-[#1C1C27] active:scale-[0.985] active:bg-[#1C1C27]",
        unread ? "opacity-100" : "opacity-75",
        focusRing
      )}
    >
      {unread ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-[16px]"
          style={{
            background: "linear-gradient(180deg, #7C3AED 0%, #2563EB 100%)",
          }}
        />
      ) : null}

      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0">
          {notification.actorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={notification.actorAvatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-white"
              style={{ backgroundColor: bg }}
              aria-hidden
            >
              {initial}
            </div>
          )}
          <TypeBadge type={notification.type} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-medium leading-[1.4] text-[#F8F8FF]">
            {message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex max-w-full items-center truncate rounded-full border border-[#ffffff0f] bg-[#1C1C27] px-2 py-[3px] text-[11px] font-semibold text-[#94A3B8]">
              {notification.tripName}
            </span>
            <span className="text-[12px] font-normal text-[#475569]">
              {timeLabel}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
