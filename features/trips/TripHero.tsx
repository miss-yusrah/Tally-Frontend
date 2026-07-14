"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, MapPin, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn, formatCompactDateRange } from "@/lib/utils";
import type { Trip } from "@/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

interface TripHeroProps {
  trip: Trip;
  memberCount: number;
  expenseCount: number;
  totalSpentMinorUnits: number;
}

export function TripHero({
  trip,
  memberCount,
  expenseCount,
  totalSpentMinorUnits,
}: TripHeroProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const dateRange = formatCompactDateRange(trip.startDate, trip.endDate);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCollapsed(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-72px 0px 0px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      {/* Hero atmospheres */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[220px]"
        style={{
          background:
            "linear-gradient(160deg, #7C3AED18 0%, #2563EB10 60%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[220px]"
        style={{
          background:
            "radial-gradient(circle 260px at 195px 0px, rgba(124, 58, 237, 0.14), transparent 70%)",
        }}
      />

      {/* Top bar — sticky; gains chrome when collapsed */}
      <div
        className={cn(
          "sticky top-0 z-30 flex h-16 items-center justify-between px-5 transition-all duration-default ease-tally safe-top",
          collapsed
            ? "border-b border-[#ffffff0f] bg-[#0A0A0F]"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
            "transition-colors hover:bg-[#1C1C27]",
            focusRing
          )}
        >
          <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2} />
        </Link>

        <h1
          className={cn(
            "pointer-events-none absolute left-1/2 max-w-[220px] -translate-x-1/2 truncate text-center text-[17px] font-semibold text-[#F8F8FF]",
            "transition-opacity duration-default ease-tally",
            collapsed ? "opacity-100" : "opacity-0"
          )}
        >
          {trip.name}
        </h1>

        <Link
          href={`/trips/${trip.id}/invite`}
          aria-label="Invite crew"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
            "transition-colors hover:bg-[#1C1C27]",
            focusRing
          )}
        >
          <UserPlus className="h-[22px] w-[22px]" strokeWidth={2} />
        </Link>
      </div>

      {/* Expanded hero body — scrolls away; sticky bar compresses via sentinel */}
      <div className="relative z-10 px-6 pb-5">
        <h2 className="mt-1 line-clamp-2 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-[#F8F8FF]">
          {trip.name}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14px] font-normal">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[#94A3B8]">
            <MapPin
              className="h-3.5 w-3.5 shrink-0 text-[#7C3AED]"
              strokeWidth={2}
            />
            <span className="truncate">{trip.destination}</span>
          </span>
          {dateRange ? (
            <>
              <span className="text-[#475569]" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#475569]">
                <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <span className="tabular-nums">{dateRange}</span>
              </span>
            </>
          ) : null}
          <span className="text-[#475569]" aria-hidden>
            ·
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-[#7C3AED40] bg-[#7C3AED1a]",
              "px-2.5 py-1 text-[12px] font-bold text-[#7C3AED]"
            )}
          >
            {trip.baseCurrency}
          </span>
        </div>

        {/* Stats card */}
        <div
          className={cn(
            "mt-4 grid h-16 grid-cols-3 items-center rounded-[14px]",
            "border border-[#ffffff0f] bg-[#0A0A0F60]",
            "shadow-[inset_0_1px_0_#ffffff0a]"
          )}
          aria-label="Trip stats"
        >
          <StatBlock label="Members" value={String(memberCount)} />
          <StatBlock
            label="Expenses"
            value={String(expenseCount)}
            withDivider
          />
          <StatBlock
            label="Total spent"
            value={formatCurrency(totalSpentMinorUnits, trip.baseCurrency, {
              compact: true,
            })}
            accent
            withDivider
          />
        </div>
      </div>

      {/* Collapse sentinel — when this scrolls under the sticky bar, chrome compresses */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent = false,
  withDivider = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  withDivider?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center",
        withDivider && "border-l border-[#ffffff0f]"
      )}
    >
      <span
        className={cn(
          "text-[18px] font-bold tabular-nums",
          accent ? "text-[#10B981]" : "text-[#F8F8FF]"
        )}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[11px] font-medium text-[#475569]">
        {label}
      </span>
    </div>
  );
}
