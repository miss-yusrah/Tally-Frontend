"use client";

import { cn } from "@/lib/utils";

export function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-[88px] rounded-[16px] border border-[#ffffff0f] bg-[#1C1C27]",
            "animate-shimmer"
          )}
        />
      ))}
    </div>
  );
}
