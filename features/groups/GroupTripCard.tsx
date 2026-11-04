"use client";

import Link from "next/link";
import { GROUP_DETAIL_ICONS } from "./groupDetailStyles";
import { formatFigmaTripCardDate } from "./tripDateFormat";
import type { GroupTripView } from "./mockGroupFriendsData";
import { cn } from "@/lib/utils";
import Image from "next/image";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

interface GroupTripCardProps {
  trip: GroupTripView;
  href?: string;
}

/**
 * Figma group Trips tab card — full-bleed photo, Upcoming/Past badge,
 * place name + pin + calendar row.
 */
export function GroupTripCard({ trip, href }: GroupTripCardProps) {
  const status = trip.status ?? inferStatus(trip.startDate);
  const dateLabel = formatFigmaTripCardDate(trip.startDate);

  const body = (
    <>
      <Image
        src={trip.coverSrc}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#15131A]/80 via-[#15131A]/25 to-transparent"
        aria-hidden
      />

      <span
        className={cn(
          "absolute right-3 top-3 z-10 rounded-full bg-white px-2.5 py-1",
          "text-[12px] font-medium leading-4 text-[#F43F5E]",
          "shadow-[0_1px_2px_rgba(21,19,26,0.08)]"
        )}
      >
        {status === "upcoming" ? "Upcoming" : "Past"}
      </span>

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col px-4 pb-4 pt-14">
        <h3 className="text-[18px] font-semibold leading-7 text-white">
          {trip.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GROUP_DETAIL_ICONS.mapPin}
            alt=""
            width={12}
            height={12}
            className="h-3 w-3 shrink-0 brightness-0 invert"
            aria-hidden
          />
          <span className="text-[12px] font-normal leading-4 text-white/95">
            {trip.destination}
          </span>
        </p>
        {dateLabel ? (
          <p className="mt-0.5 flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={GROUP_DETAIL_ICONS.calendar}
              alt=""
              width={12}
              height={12}
              className="h-3 w-3 shrink-0 brightness-0 invert"
              aria-hidden
            />
            <span className="text-[12px] font-normal leading-4 text-white/95">
              {dateLabel}
            </span>
          </p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "relative block w-full overflow-hidden rounded-[20px]",
    "aspect-[358/200]",
    href && "transition-transform duration-fast ease-tally active:scale-[0.99]",
    href && focusRing
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`${trip.name}, ${status}`}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
}

function inferStatus(startISO: string): "upcoming" | "past" {
  const [y, m, d] = startISO.split("-").map(Number);
  if (!y || !m || !d) return "upcoming";
  const start = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return start >= today ? "upcoming" : "past";
}
