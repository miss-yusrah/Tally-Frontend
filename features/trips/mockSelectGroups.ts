/**
 * Groups for the “Who’s coming?” step — prefer real trips from the store,
 * with mock covers/avatars until the API supplies member stacks.
 */

import {
  FIGMA_HERO_AVATAR_CLUSTER,
  FIGMA_USER_AVATAR_POOL,
} from "@/features/home/figmaUserAvatars";
import type { Trip } from "@/types";

export interface SelectGroupView {
  id: string;
  name: string;
  friendCount: number;
  tripCount: number;
  coverSrc: string;
  /** Up to 5 faces for the card stack */
  avatarSrcs: string[];
}

const CARD = (n: 1 | 2 | 3 | 4) =>
  `/tabr/home/images/card images/card image ${n}.webp`;

function avatarStack(count: number, offset = 0): string[] {
  const size = Math.min(Math.max(count, 1), 5);
  return Array.from({ length: size }, (_, i) => {
    if (i < FIGMA_HERO_AVATAR_CLUSTER.length) {
      return FIGMA_HERO_AVATAR_CLUSTER[(i + offset) % FIGMA_HERO_AVATAR_CLUSTER.length];
    }
    return FIGMA_USER_AVATAR_POOL[(i + offset) % FIGMA_USER_AVATAR_POOL.length];
  });
}

/** Figma “Who’s coming?” list order. */
export const MOCK_SELECT_GROUPS: SelectGroupView[] = [
  {
    id: "preview-trip-my-day-ones",
    name: "My Day Ones",
    friendCount: 8,
    tripCount: 3,
    coverSrc: CARD(1),
    avatarSrcs: avatarStack(5, 0),
  },
  {
    id: "preview-trip-wanderlust",
    name: "My girls",
    friendCount: 4,
    tripCount: 5,
    coverSrc: CARD(2),
    avatarSrcs: avatarStack(4, 1),
  },
  {
    id: "preview-trip-journey-collective",
    name: "The Journey Collective",
    friendCount: 8,
    tripCount: 3,
    coverSrc: CARD(3),
    avatarSrcs: avatarStack(5, 2),
  },
  {
    id: "preview-trip-travel-tribe",
    name: "My millionaire crew",
    friendCount: 6,
    tripCount: 7,
    coverSrc: CARD(4),
    avatarSrcs: avatarStack(5, 3),
  },
];

export function filterSelectGroups(
  groups: SelectGroupView[],
  query: string
): SelectGroupView[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups.filter((group) => group.name.toLowerCase().includes(q));
}

/** Map a real trip/group into the select-group card shape. */
export function tripToSelectGroupView(
  trip: Trip,
  index = 0
): SelectGroupView {
  const coverN = ((index % 4) + 1) as 1 | 2 | 3 | 4;
  return {
    id: trip.id,
    name: trip.name,
    friendCount: 1,
    tripCount: 1,
    coverSrc: trip.coverImageUrl || CARD(coverN),
    avatarSrcs: avatarStack(4, index),
  };
}

export function tripsToSelectGroupViews(trips: Trip[]): SelectGroupView[] {
  return trips.map((trip, index) => tripToSelectGroupView(trip, index));
}
