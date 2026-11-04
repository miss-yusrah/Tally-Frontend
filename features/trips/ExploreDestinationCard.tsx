"use client";

import { Star } from "lucide-react";
import { GROUP_DETAIL_ICONS } from "@/features/groups/groupDetailStyles";
import { cn } from "@/lib/utils";
import type { ExploreDestination } from "./mockExploreDestinations";
import Image from "next/image";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

interface ExploreDestinationCardProps {
  destination: ExploreDestination;
  onSelect?: (destination: ExploreDestination) => void;
}

/**
 * Full-bleed place card for the add-trip explore list (Figma destination cards).
 * Image is a placeholder from public/tabr/Trip cards until the API lands.
 */
export function ExploreDestinationCard({
  destination,
  onSelect,
}: ExploreDestinationCardProps) {
  const location = `${destination.area}, ${destination.city}`;
  const meta = `${destination.rating} (${destination.reviewCount} reviews) • ${destination.priceLabel}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(destination)}
      className={cn(
        "relative block w-full overflow-hidden rounded-[16px] text-left",
        "aspect-[358/210] transition-transform duration-fast ease-tally active:scale-[0.99]",
        focusRing
      )}
      aria-label={`${destination.name}, ${location}, ${meta}`}
    >
      <Image
        src={destination.imageSrc}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#15131A]/75 via-[#15131A]/25 to-transparent"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start px-4 pb-3.5 pt-10">
        <h3 className="text-[18px] font-semibold leading-[27px] tracking-normal text-white">
          {destination.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1">
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
            {location}
          </span>
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-[12px] font-normal leading-4 text-white/95">
          <Star
            className="h-3 w-3 shrink-0 fill-[#FACC15] text-[#FACC15]"
            aria-hidden
          />
          <span className="truncate">{meta}</span>
        </p>
      </div>
    </button>
  );
}
