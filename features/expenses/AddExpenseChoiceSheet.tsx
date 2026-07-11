"use client";

import { useRouter } from "next/navigation";
import { Camera, Pencil } from "lucide-react";
import { useCloseBottomSheet } from "@/store";
import { cn } from "@/lib/utils";

interface AddExpenseChoiceSheetProps {
  tripId: string;
}

const rowClasses = cn(
  "flex h-[72px] w-full items-center gap-4 rounded-[16px] px-4 text-left",
  "border border-[#ffffff0f] bg-[#13131A]",
  "transition-colors duration-fast ease-tally active:bg-[#1C1C27]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13131A]"
);

export function AddExpenseChoiceSheet({ tripId }: AddExpenseChoiceSheetProps) {
  const router = useRouter();
  const closeBottomSheet = useCloseBottomSheet();

  const go = (path: string) => {
    closeBottomSheet();
    router.push(path);
  };

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Gradient stroke definition for the camera icon */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient
            id="tally-scan-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>

      <button
        type="button"
        onClick={() => go(`/trips/${tripId}/expenses/scan`)}
        className={rowClasses}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#7C3AED1a]">
          <Camera
            className="h-6 w-6"
            stroke="url(#tally-scan-gradient)"
            strokeWidth={2}
          />
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-[#F8F8FF]">
            Scan receipt
          </span>
          <span className="mt-0.5 block text-[13px] font-normal text-[#94A3B8]">
            Let AI read the details
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => go(`/trips/${tripId}/expenses/new`)}
        className={rowClasses}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#1C1C27]">
          <Pencil className="h-6 w-6 text-[#94A3B8]" strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold text-[#F8F8FF]">
            Enter manually
          </span>
          <span className="mt-0.5 block text-[13px] font-normal text-[#94A3B8]">
            Type it in yourself
          </span>
        </span>
      </button>
    </div>
  );
}
