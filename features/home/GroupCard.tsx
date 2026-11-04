"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FIGMA_HERO_AVATAR_CLUSTER,
  figmaUserAvatarAt,
} from "./figmaUserAvatars";
import type { Trip, TripMember } from "@/types";

/** Figma home group card fallback when a group has no custom cover. */
const DEFAULT_COVER_SRC = "/tabr/home/images/group-cover.webp";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const metaTextClass =
  "text-left text-[12px] font-normal leading-4 text-white/80";

interface GroupCardProps {
  trip: Trip;
  members?: TripMember[];
  /** Kept for list callers; cover treatment no longer uses pastel card colours. */
  colorIndex?: number;
  /** Shown as “N trip(s)” until backend tracks trip history per group. */
  tripCount?: number;
}

/** Up to 5 faces — member avatars first, then Figma pool from home/avatars. */
function buildAvatarStack(members: TripMember[]): string[] {
  const fromMembers = members
    .slice(0, 5)
    .map((member, index) => member.avatarUrl || figmaUserAvatarAt(index));

  if (fromMembers.length >= 5) return fromMembers;

  const filled = [...fromMembers];
  for (let i = 0; filled.length < 5; i++) {
    filled.push(FIGMA_HERO_AVATAR_CLUSTER[i % FIGMA_HERO_AVATAR_CLUSTER.length]);
  }
  return filled;
}

/** Figma “20 Oct” — day then short month. */
function formatNextDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function GroupCard({
  trip,
  members = [],
  tripCount = 1,
}: GroupCardProps) {
  const friendCount = Math.max(members.length, 1);
  const friendLabel = friendCount === 1 ? "1 friend" : `${friendCount} friends`;
  const tripLabel = tripCount === 1 ? "1 trip" : `${tripCount} trips`;
  const nextLabel = buildNextLabel(trip);
  const faces = buildAvatarStack(members);
  const coverSrc = trip.coverImageUrl || DEFAULT_COVER_SRC;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "relative block w-full overflow-hidden rounded-[24px]",
        "aspect-[358/280]",
        "transition-transform duration-fast ease-tally active:scale-[0.99]",
        focusRing
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#15131A]/70 via-[#15131A]/25 to-transparent"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col px-4 pb-4 pt-16 xs:px-5 xs:pb-5">
        <h3
          className={cn(
            "text-left text-white",
            "text-[16px] font-medium leading-6"
          )}
        >
          {trip.name}
        </h3>
        <p className={cn(metaTextClass, "mt-0.5")}>
          {friendLabel} • {tripLabel}
        </p>

        <div
          className="mt-3 flex items-center"
          aria-label={`${friendCount} members`}
        >
          {faces.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${src}-${index}`}
              src={src}
              alt=""
              width={24}
              height={24}
              className={cn(
                "relative h-6 w-6 rounded-full object-cover",
                "border border-white",
                index > 0 && "-ml-2"
              )}
              style={{ zIndex: index + 1 }}
            />
          ))}
        </div>

        <div className="my-3 h-px w-full bg-white/80" aria-hidden />
        <p className={metaTextClass}>
          {nextLabel ?? "No upcoming trips"}
        </p>
      </div>
    </Link>
  );
}

function buildNextLabel(trip: Trip): string | null {
  const destination = trip.destination.trim();
  const date = trip.startDate ? formatNextDate(trip.startDate) : "";

  if (destination && date) return `Next: ${destination} • ${date}`;
  if (destination) return `Next: ${destination}`;
  if (date) return `Next: ${date}`;
  return null;
}
