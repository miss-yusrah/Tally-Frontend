"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import {
  AuthBackButton,
  authControlBoxClass,
  authStackCtaClass,
  useAuthSession,
} from "@/features/auth";
import { HomeProfileAvatarLink } from "@/features/home";
import { GROUP_DETAIL_ICONS } from "@/features/groups/groupDetailStyles";
import { useCreatedTripDraftStore } from "@/store";
import { cn } from "@/lib/utils";
import type { CreatedTripDraft } from "@/store/createdTripDraftStore";
import { getPreviewOutingDraft } from "@/features/groups/mockGroupFriendsData";
import { TripCreatedOverlay } from "./TripCreatedOverlay";
import { PlaceMapPreview } from "./PlaceMapPreview";
import Image from "next/image";
import {
  formatOutingTime,
  formatOutingWeekdayDate,
} from "./outingFormat";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const secondaryBtnClass = cn(
  authControlBoxClass,
  "flex items-center justify-center border border-[#E5E5E5] bg-white",
  "text-[16px] font-semibold leading-none text-[#15131A]",
  "transition-[transform,background-color] duration-150",
  "hover:bg-[#FAFAFA] active:scale-[0.98]",
  focusRing
);

const cardClass = cn(
  "w-full rounded-[20px] bg-white p-4",
  "shadow-[0_1px_3px_rgba(21,19,26,0.06)]"
);

interface CreatedTripDetailsScreenProps {
  groupId: string;
  outingId: string;
}

/**
 * Post-create outing details (Figma: Coffee date) + optional success overlay.
 */
export function CreatedTripDetailsScreen({
  groupId,
  outingId,
}: CreatedTripDetailsScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthSession();
  const hydrateDraft = useCreatedTripDraftStore((s) => s.hydrateDraft);
  const getDraftById = useCreatedTripDraftStore((s) => s.getDraftById);

  const [draft, setDraft] = useState<CreatedTripDraft | null>(null);
  const [createdOpen, setCreatedOpen] = useState(
    () => searchParams.get("created") === "1"
  );

  useEffect(() => {
    hydrateDraft();
    setDraft(getDraftById(outingId) ?? getPreviewOutingDraft(outingId));
  }, [outingId, hydrateDraft, getDraftById]);

  useEffect(() => {
    if (searchParams.get("created") !== "1") return;
    // Drop the query so refresh doesn’t re-show the modal.
    router.replace(`/trips/${groupId}/outings/${outingId}`, { scroll: false });
  }, [searchParams, router, groupId, outingId]);

  if (!draft || draft.groupId !== groupId) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-[var(--new-bg,#FAFAFA)] px-6">
        <p className="text-center text-[14px] text-[#716D7D]">
          Trip not found. Create one from explore to preview this screen.
        </p>
      </div>
    );
  }

  const location = `${draft.area}, ${draft.city}`;
  const meta = `${draft.rating} (${draft.reviewCount} reviews) • ${draft.priceLabel}`;
  const dateLabel = formatOutingWeekdayDate(draft.date);
  const timeLabel = formatOutingTime(draft.time);
  const friendLabel =
    draft.friendCount === 1 ? "1 friend" : `${draft.friendCount} friends`;

  const onAddExpense = () => {
    router.push(`/trips/${groupId}/outings/${outingId}/expenses`);
  };

  return (
    <>
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full flex-col",
          "bg-[var(--new-bg,#FAFAFA)]",
          "px-5 xs:px-6",
          "pb-[max(1.5rem,var(--safe-bottom))]",
          "pt-[calc(max(var(--safe-top),47px)+1rem)]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between">
          <AuthBackButton
            href={`/trips/${draft.groupId}?tab=trips`}
            label="Back to trips"
          />
          <HomeProfileAvatarLink avatarUrl={user?.avatarUrl} />
        </div>

        <h1 className="text-tabr-ink-heading-2 mt-5 w-full shrink-0">
          {draft.name}
        </h1>

        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
          {/* Place hero card */}
          <article className="relative w-full overflow-hidden rounded-[20px] aspect-[358/220]">
            <Image
              src={draft.imageSrc}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#15131A]/75 via-[#15131A]/20 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col px-4 pb-4 pt-12">
              <h2 className="text-[18px] font-semibold leading-7 text-white">
                {draft.placeName}
              </h2>
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
          </article>

          {/* Group */}
          <section className={cardClass} aria-label="Group">
            <h2 className="text-tabr-ink-paragraph-medium">{draft.groupName}</h2>
            <p className="text-tabr-ink-paragraph-mini-secondary mt-0.5">
              {friendLabel}
            </p>
            <div className="mt-3 flex items-center" aria-hidden>
              {draft.avatarSrcs.map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt=""
                  width={28}
                  height={28}
                  className={cn(
                    "relative h-7 w-7 rounded-full border-2 border-white object-cover",
                    index > 0 && "-ml-2"
                  )}
                  style={{ zIndex: index + 1 }}
                />
              ))}
            </div>
          </section>

          {/* Date & time */}
          <section className={cardClass} aria-label="Date and time">
            <h2 className="text-tabr-ink-paragraph-medium">{dateLabel}</h2>
            <p className="text-tabr-ink-paragraph-mini-secondary mt-0.5">
              {timeLabel}
            </p>
          </section>

          {/* Location + map */}
          <section className={cardClass} aria-label="Location">
            <h2 className="text-tabr-ink-paragraph-medium">Location</h2>
            <p className="text-tabr-ink-paragraph-mini-secondary mt-1.5">
              {draft.address}
            </p>
            <div className="mt-3">
              <PlaceMapPreview placeName={draft.placeName} />
            </div>
          </section>
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-3 pt-2">
          <Link
            href={`/trips/${draft.groupId}?tab=trips`}
            className={secondaryBtnClass}
          >
            View group
          </Link>
          <button
            type="button"
            onClick={onAddExpense}
            className={cn("w-full", authStackCtaClass(true), focusRing)}
          >
            Add expense
          </button>
        </div>
      </div>

      <TripCreatedOverlay
        open={createdOpen}
        onViewDetails={() => setCreatedOpen(false)}
        onClose={() => setCreatedOpen(false)}
      />
    </>
  );
}
