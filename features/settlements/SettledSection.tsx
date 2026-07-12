"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SettledRow } from "@/features/settlements/SettledRow";
import { cn } from "@/lib/utils";
import type { Settlement, TripMember } from "@/types";

const PREVIEW_LIMIT = 3;

interface SettledSectionProps {
  tripId: string;
  settlements: Settlement[];
  memberById: Map<string, TripMember>;
  currency: string;
  currentUserId?: string;
}

export function SettledSection({
  tripId,
  settlements,
  memberById,
  currency,
  currentUserId,
}: SettledSectionProps) {
  const confirmed = settlements.filter((s) => !s._optimistic);
  if (confirmed.length === 0) return null;

  const preview = confirmed.slice(0, PREVIEW_LIMIT);
  const hasMore = confirmed.length > PREVIEW_LIMIT;

  return (
    <section className="mt-8" aria-label="Settled payments">
      <div className="mb-4 border-t border-[#ffffff0f] pt-6">
        <h2 className="text-[15px] font-semibold text-[#F8F8FF]">Settled</h2>
      </div>
      <div>
        {preview.map((settlement, index) => (
          <SettledRow
            key={settlement.id}
            settlement={settlement}
            payer={memberById.get(settlement.fromUserId)}
            recipient={memberById.get(settlement.toUserId)}
            currency={currency}
            currentUserId={currentUserId}
            variant="dashboard"
            showDivider={index < preview.length - 1 || hasMore}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Link
            href={`/trips/${tripId}/settlements`}
            className={cn(
              "inline-flex h-11 items-center gap-1 text-[14px] font-medium text-[#94A3B8]",
              "transition-colors hover:text-[#F8F8FF]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            )}
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
