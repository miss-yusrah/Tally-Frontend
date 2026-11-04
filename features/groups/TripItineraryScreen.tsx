"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuthSession } from "@/features/auth";
import { FIGMA_HERO_AVATAR_CLUSTER } from "@/features/home/figmaUserAvatars";
import { HomeProfileAvatarLink } from "@/features/home";
import { useAddToast } from "@/store";
import {
  GROUP_DETAIL_ICONS,
  groupDetailFocusRing,
  groupDetailHeroFocusRing,
} from "./groupDetailStyles";
import { GROUP_HERO_COVER } from "./mockGroupFriendsData";
import type { GroupEventView, GroupTripView } from "./mockGroupFriendsData";
import { formatFigmaTripDates } from "./tripDateFormat";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface TripItineraryScreenProps {
  trip: GroupTripView;
  events: GroupEventView[];
}

export function TripItineraryScreen({ trip, events }: TripItineraryScreenProps) {
  const { user } = useAuthSession();
  const addToast = useAddToast();
  const backHref = `/trips/${trip.groupId}?tab=trips`;
  const dateLabel = formatFigmaTripDates(trip.startDate, trip.endDate);

  const comingSoon = (message: string) => {
    addToast({ message, variant: "info", duration: 2500 });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header
        className={cn(
          "relative w-full shrink-0 bg-white",
          "pt-[calc(max(var(--safe-top),47px))]"
        )}
      >
        <div className="relative h-[clamp(280px,44vh,380px)] min-h-[260px] w-full overflow-hidden sm:min-h-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image
            src={GROUP_HERO_COVER}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#15131A]/35 via-[#15131A]/5 to-[#15131A]/70"
            aria-hidden
          />

          <div
            className={cn(
              "absolute inset-x-0 top-0 z-30 flex items-center justify-between",
              "px-5 pt-4 xs:px-6"
            )}
          >
            <Link
              href={backHref}
              aria-label="Back to trips"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-white",
                "transition-opacity active:opacity-80",
                groupDetailHeroFocusRing
              )}
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </Link>
            <HomeProfileAvatarLink
              avatarUrl={user?.avatarUrl}
              ringOffsetClass="focus-visible:ring-offset-transparent"
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-5 pb-6 pt-16 text-center xs:px-6 sm:pb-8">
            <div className="flex items-center justify-center pl-2" aria-hidden>
              {FIGMA_HERO_AVATAR_CLUSTER.map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt=""
                  width={32}
                  height={32}
                  className={cn(
                    "relative h-8 w-8 rounded-full border-2 border-white object-cover sm:h-9 sm:w-9",
                    index > 0 && "-ml-2.5 sm:-ml-3"
                  )}
                  style={{ zIndex: index + 1 }}
                />
              ))}
            </div>

            <h1 className="text-tabr-hero-paragraph-large-medium mt-3 max-w-full truncate">
              {trip.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={GROUP_DETAIL_ICONS.mapPin}
                  alt=""
                  width={12}
                  height={12}
                  className="h-3 w-3 shrink-0 brightness-0 invert"
                  aria-hidden
                />
                <span className="text-[12px] font-normal leading-4 text-white">
                  {trip.destination}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={GROUP_DETAIL_ICONS.calendar}
                  alt=""
                  width={12}
                  height={12}
                  className="h-3 w-3 shrink-0 brightness-0 invert"
                  aria-hidden
                />
                <span className="text-[12px] font-normal leading-4 text-white">
                  {dateLabel}
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-4 xs:px-5">
        <div className="flex items-center gap-2">
          <PlusIconButton
            label="Add people"
            onClick={() => comingSoon("Add people is coming soon.")}
          />
          <PlusIconButton
            label="Add"
            onClick={() => comingSoon("Add is coming soon.")}
          />
        </div>
        <button
          type="button"
          onClick={() => comingSoon("Add event is coming soon.")}
          className={cn(
            "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2",
            "rounded-full bg-[#5921B5] px-6 py-2.5",
            "text-[16px] font-semibold leading-none text-white",
            "transition-[transform,background-color] duration-150",
            "hover:bg-[#4A1C96] active:scale-[0.98]",
            groupDetailFocusRing
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GROUP_DETAIL_ICONS.plus}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 brightness-0 invert"
            aria-hidden
          />
          Add event
        </button>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 xs:px-5">
        {events.map((event) => (
          <li key={event.id}>
            <TripEventCard event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlusIconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        "transition-colors hover:bg-[#FAFAFA] active:bg-[#F0EEF5]",
        groupDetailFocusRing
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GROUP_DETAIL_ICONS.plus}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6"
        aria-hidden
      />
    </button>
  );
}

function TripEventCard({ event }: { event: GroupEventView }) {
  return (
    <article className="flex w-full min-w-0 items-center gap-3 rounded-[16px] bg-[var(--card-colour1,#F1ECF9)] p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={event.coverSrc}
        alt=""
        width={72}
        height={72}
        className="h-14 w-14 shrink-0 rounded-[12px] object-cover xs:h-[72px] xs:w-[72px]"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-tabr-ink-paragraph-medium truncate">{event.name}</h3>
        <p className="text-tabr-ink-paragraph-mini-secondary mt-1 truncate">
          {formatFigmaTripDates(event.startDate, event.endDate)}
        </p>
      </div>
    </article>
  );
}
