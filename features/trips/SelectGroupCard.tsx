"use client";

import { cn } from "@/lib/utils";
import type { SelectGroupView } from "./mockSelectGroups";
import Image from "next/image";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

interface SelectGroupCardProps {
  group: SelectGroupView;
  onSelect?: (group: SelectGroupView) => void;
}

/**
 * Figma “Who’s coming?” group card — photo cover, name, friends/trips, avatars.
 * Simpler than home GroupCard (no “Next:” row).
 */
export function SelectGroupCard({ group, onSelect }: SelectGroupCardProps) {
  const friendLabel =
    group.friendCount === 1 ? "1 friend" : `${group.friendCount} friends`;
  const tripLabel =
    group.tripCount === 1 ? "1 trip" : `${group.tripCount} trips`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(group)}
      className={cn(
        "relative block w-full overflow-hidden rounded-[24px] text-left",
        "aspect-[358/280]",
        "transition-transform duration-fast ease-tally active:scale-[0.99]",
        focusRing
      )}
      aria-label={`${group.name}, ${friendLabel}, ${tripLabel}`}
    >
      <Image
        src={group.coverSrc}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#15131A]/75 via-[#15131A]/25 to-transparent"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col px-4 pb-4 pt-16 xs:px-5 xs:pb-5">
        <h3 className="text-[16px] font-medium leading-6 text-white">
          {group.name}
        </h3>
        <p className="mt-0.5 text-[12px] font-normal leading-4 text-white/90">
          {friendLabel} • {tripLabel}
        </p>

        <div
          className="mt-3 flex items-center"
          aria-label={`${group.friendCount} members`}
        >
          {group.avatarSrcs.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${group.id}-${src}-${index}`}
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
      </div>
    </button>
  );
}
