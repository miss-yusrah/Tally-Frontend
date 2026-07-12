import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { MemberAvatarStack } from "@/components/shared/MemberAvatarStack";
import { formatCompactDateRange, cn } from "@/lib/utils";
import type { Trip, TripMember } from "@/types";

interface TripCardProps {
  trip: Trip;
  members?: TripMember[];
  /** Past trips render muted so active trips stay the focal content. */
  variant?: "active" | "past";
  className?: string;
}

export function TripCard({
  trip,
  members = [],
  variant = "active",
  className,
}: TripCardProps) {
  const isPast = variant === "past";
  const hasDates = Boolean(trip.startDate || trip.endDate);
  const dateLabel = hasDates
    ? formatCompactDateRange(trip.startDate, trip.endDate) || "No dates set"
    : "No dates set";

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "relative block overflow-hidden rounded-[20px] border border-[#ffffff0f] bg-[#13131A] p-5",
        // Physical top-edge highlight
        "shadow-[inset_0_1px_0_#ffffff0a]",
        "transition-all duration-default ease-tally active:scale-[0.99]",
        isPast
          ? "opacity-60"
          : [
              "hover:shadow-[inset_0_1px_0_#ffffff0a,0_0_0_1px_#7C3AED60]",
              "focus-visible:shadow-[inset_0_1px_0_#ffffff0a,0_0_0_1px_#7C3AED60]",
            ],
        "focus-visible:outline-none",
        className
      )}
    >
      {/* Active live accent — gradient left rail */}
      {!isPast && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-[20px]"
          style={{
            background: "linear-gradient(180deg, #7C3AED 0%, #2563EB 100%)",
          }}
        />
      )}

      {/* Top row — name + currency pill */}
      <div className="flex items-start justify-between gap-3">
        <h3
          className={cn(
            "min-w-0 flex-1 truncate text-[18px] font-bold tracking-[-0.01em]",
            isPast ? "text-[#94A3B8]" : "text-[#F8F8FF]"
          )}
        >
          {trip.name}
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.02em]",
            isPast
              ? "border border-[#ffffff0f] bg-[#1C1C27] text-[#94A3B8]"
              : "border border-[#7C3AED40] bg-[#7C3AED1a] text-[#7C3AED]"
          )}
        >
          {trip.baseCurrency}
        </span>
      </div>

      {/* Destination */}
      <div className="mt-3 flex items-center gap-1.5">
        <MapPin
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isPast ? "text-[#475569]" : "text-[#7C3AED]"
          )}
          strokeWidth={2}
        />
        <span
          className={cn(
            "truncate text-[14px] font-normal",
            isPast ? "text-[#475569]" : "text-[#94A3B8]"
          )}
        >
          {trip.destination}
        </span>
      </div>

      {/* Dates */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <Calendar
          className="h-3.5 w-3.5 shrink-0 text-[#475569]"
          strokeWidth={2}
        />
        <span className="text-[14px] font-normal tabular-nums text-[#475569]">
          {dateLabel}
        </span>
      </div>

      {/* Member faces — group presence */}
      {members.length > 0 && (
        <div className="mt-4">
          <MemberAvatarStack members={members} />
        </div>
      )}
    </Link>
  );
}
