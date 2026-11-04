"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { useAuthSession } from "@/features/auth";
import { HomeProfileAvatarLink } from "@/features/home";
import { GROUP_DETAIL_ICONS } from "@/features/groups/groupDetailStyles";
import { useAddToast } from "@/store";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  getExploreDestinationDetailImage,
  type ExploreDestination,
} from "./mockExploreDestinations";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

/**
 * Compact purple pill — same 52px height / radius / color as shared CTAs,
 * but auto-width for the Figma footer (not full-bleed).
 */
const createTripBtnClass = cn(
  "box-border inline-flex h-[52px] shrink-0 items-center justify-center",
  "rounded-full bg-[#5921B5] px-6",
  "text-[16px] font-semibold leading-none text-white",
  "transition-[transform,background-color] duration-150",
  "hover:bg-[#4A1C96] active:scale-[0.98]",
  focusRing
);

interface LocationDetailsScreenProps {
  groupId: string;
  destination: ExploreDestination;
}

/**
 * Add-trip flow — location details (full-bleed hero + Create trip).
 * Uses public/tabr/Trip cards/trip location.webp (and mocks) until the API lands.
 */
export function LocationDetailsScreen({
  groupId,
  destination,
}: LocationDetailsScreenProps) {
  const router = useRouter();
  const { user } = useAuthSession();
  const addToast = useAddToast();
  const backHref = `/trips/${groupId}/trips/new`;
  const heroSrc = getExploreDestinationDetailImage(destination);
  const location = `${destination.area}, ${destination.city}`;
  const meta = `${destination.rating} (${destination.reviewCount} reviews) • ${destination.priceLabel}`;

  const onShare = async () => {
    const shareText = `${destination.name} — ${location}\n${destination.priceLabel}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: destination.name,
          text: shareText,
        });
        return;
      }
    } catch {
      // User cancelled or share failed — fall through to toast.
    }
    addToast({
      message: "Sharing is coming soon.",
      variant: "info",
      duration: 2500,
    });
  };

  /** Already in a group context — skip “Who’s coming?” and go customise. */
  const onCreateTrip = () => {
    router.push(
      `/trips/${groupId}/trips/new/${destination.id}/customise?group=${encodeURIComponent(groupId)}`
    );
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-clip bg-[#15131A]">
      <Image
        src={heroSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#15131A]/45 via-[#15131A]/25 to-[#15131A]/85"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#15131A]/90 via-[#15131A]/55 to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 flex min-h-dvh w-full flex-col",
          "px-5 xs:px-6",
          "pt-[calc(max(var(--safe-top),47px)+1rem)]",
          "pb-[max(1.25rem,var(--safe-bottom))]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between">
          <Link
            href={backHref}
            aria-label="Back to explore"
            className={cn(
              "-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white",
              "transition-opacity active:opacity-80",
              focusRing
            )}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </Link>
          <HomeProfileAvatarLink
            avatarUrl={user?.avatarUrl}
            ringOffsetClass="focus-visible:ring-offset-transparent"
          />
        </div>

        <div className="mt-auto flex w-full flex-col">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] text-white sm:text-[30px]">
            {destination.name}
          </h1>

          <p className="mt-2 flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={GROUP_DETAIL_ICONS.mapPin}
              alt=""
              width={12}
              height={12}
              className="h-3 w-3 shrink-0 brightness-0 invert"
              aria-hidden
            />
            <span className="text-[14px] font-normal leading-5 text-white">
              {location}
            </span>
          </p>

          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[14px] font-normal leading-5 text-white">
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-[#FACC15] text-[#FACC15]"
              aria-hidden
            />
            <span className="truncate">{meta}</span>
          </p>

          <p className="mt-4 max-w-[22rem] text-[14px] font-normal leading-5 text-white/95 sm:max-w-none sm:text-[15px] sm:leading-6">
            {destination.description}
          </p>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => void onShare()}
              className={cn(
                "shrink-0 text-[14px] font-medium leading-5 text-white underline",
                "underline-offset-4 decoration-white/90",
                "transition-opacity active:opacity-80",
                focusRing,
                "rounded-sm"
              )}
            >
              Share with friends
            </button>

            <button type="button" onClick={onCreateTrip} className={createTripBtnClass}>
              Create trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
