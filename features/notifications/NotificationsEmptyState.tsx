"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationsEmptyState() {
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
              id="notif-empty-grad"
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
          <path
            d="M20 8a8 8 0 0 0-8 8v4.5c0 .8-.3 1.6-.9 2.2L9 25h22l-2.1-2.3a3.2 3.2 0 0 1-.9-2.2V16a8 8 0 0 0-8-8Z"
            stroke="url(#notif-empty-grad)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M17 28a3 3 0 0 0 6 0"
            stroke="url(#notif-empty-grad)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="mt-5 text-[19px] font-bold text-[#F8F8FF]">
        No notifications yet
      </h2>
      <p className="mt-2 max-w-[240px] text-[14px] font-normal leading-[1.6] text-[#94A3B8]">
        Activity from your trips will show up here.
      </p>
      <Bell className="sr-only" />
    </div>
  );
}
