"use client";

import { cn } from "@/lib/utils";

export function BalancesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div
        className={cn(
          "h-[72px] rounded-[16px] bg-[#1C1C27] animate-shimmer",
          "border border-[#ffffff0f]"
        )}
      />
      <div className="h-[120px] rounded-[20px] bg-[#1C1C27] animate-shimmer border border-[#ffffff0f]" />
      <div className="h-[120px] rounded-[20px] bg-[#1C1C27] animate-shimmer border border-[#ffffff0f]" />
    </div>
  );
}
