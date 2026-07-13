"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { MemberAvatarStack } from "@/components/shared/MemberAvatarStack";
import { formatCurrency } from "@/lib/currency";
import { formatCompactDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Trip, TripMember } from "@/types";

interface TripBalanceCardProps {
  trip: Trip;
  netMinorUnits: number;
  unsettledCount: number;
  members?: TripMember[];
  membersLoading?: boolean;
  className?: string;
}

function NetPositionPill({
  netMinorUnits,
  currency,
}: {
  netMinorUnits: number;
  currency: string;
}) {
  if (netMinorUnits > 0) {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full border border-[#10B98140] bg-[#10B98115]",
          "px-3 py-[5px] text-[13px] font-bold tabular-nums text-[#10B981]"
        )}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        +{formatCurrency(netMinorUnits, currency)}
      </span>
    );
  }

  if (netMinorUnits < 0) {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full border border-[#F43F5E40] bg-[#F43F5E15]",
          "px-3 py-[5px] text-[13px] font-bold tabular-nums text-[#F43F5E]"
        )}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        -{formatCurrency(-netMinorUnits, currency)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border border-[#ffffff0f] bg-[#ffffff08]",
        "px-3 py-[5px] text-[12px] font-semibold text-[#94A3B8]"
      )}
    >
      Settled
    </span>
  );
}

export function TripBalanceCard({
  trip,
  netMinorUnits,
  unsettledCount,
  members,
  membersLoading = false,
  className,
}: TripBalanceCardProps) {
  const dateLabel = formatCompactDateRange(trip.startDate, trip.endDate);
  const balanceHref = `/trips/${trip.id}/balances`;

  return (
    <Link
      href={balanceHref}
      aria-label={`View ${trip.name} balances`}
      className={cn(
        "block w-full rounded-[20px] border border-[#ffffff0f] bg-[#13131A] p-5 text-left",
        "shadow-[inset_0_1px_0_#ffffff0a]",
        "transition-all duration-fast ease-tally",
        "active:scale-[0.985] active:border-[#7C3AED60] active:bg-[#1C1C27]",
        "hover:border-[#7C3AED60] hover:bg-[#1C1C27]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#F8F8FF]">
          {trip.name}
        </h3>
        <NetPositionPill
          netMinorUnits={netMinorUnits}
          currency={trip.baseCurrency}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-normal">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[#94A3B8]">
          <MapPin
            className="h-[13px] w-[13px] shrink-0 text-[#7C3AED]"
            strokeWidth={2}
          />
          <span className="truncate">{trip.destination}</span>
        </span>
        {dateLabel ? (
          <>
            <span className="text-[#475569]" aria-hidden>
              ·
            </span>
            <span className="tabular-nums text-[#475569]">{dateLabel}</span>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <MemberAvatarStack
          members={members}
          size="sm"
          loading={membersLoading}
          placeholderCount={2}
        />
        {unsettledCount > 0 ? (
          <span
            className={cn(
              "shrink-0 rounded-full border border-[#7C3AED40] bg-[#7C3AED1a]",
              "px-2 py-[3px] text-[11px] font-semibold text-[#7C3AED]"
            )}
          >
            {unsettledCount} unsettled
          </span>
        ) : null}
      </div>
    </Link>
  );
}
