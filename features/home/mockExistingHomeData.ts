import type { Trip, TripMember } from "@/types";
import { FIGMA_USER_AVATAR_POOL } from "./figmaUserAvatars";

/**
 * Demo data for /dashboard?preview=existing — "groups over time".
 *
 * This is used so you can preview the home UI without a backend.
 */

export const MOCK_EXISTING_HOME_TRIPS: Trip[] = [
  {
    id: "preview-trip-my-day-ones",
    name: "My Day Ones",
    destination: "Mountain Retreat",
    startDate: "2026-10-20",
    endDate: "2026-10-22",
    baseCurrency: "NGN",
    baseCurrencyLockedAt: null,
    coverImageUrl: "/tabr/home/images/group-cover.webp",
    inviteToken: "preview-token-mountain",
    createdBy: "preview-user",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "preview-trip-wanderlust",
    name: "My girls",
    destination: "Beach getaway",
    startDate: "2026-09-15",
    endDate: "2026-09-17",
    baseCurrency: "USD",
    baseCurrencyLockedAt: null,
    coverImageUrl: "/tabr/home/images/friends.webp",
    inviteToken: "preview-token-beach",
    createdBy: "preview-user",
    createdAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "preview-trip-travel-tribe",
    name: "My millionaire crew",
    destination: "Mountain Retreat",
    startDate: "2026-10-20",
    endDate: "2026-10-22",
    baseCurrency: "EUR",
    baseCurrencyLockedAt: null,
    coverImageUrl: "/tabr/home/images/friends2.webp",
    inviteToken: "preview-token-city",
    createdBy: "preview-user",
    createdAt: "2026-03-18T00:00:00.000Z",
  },
  {
    id: "preview-trip-journey-collective",
    name: "The Journey Collective",
    destination: "",
    startDate: "",
    endDate: "",
    baseCurrency: "NGN",
    baseCurrencyLockedAt: null,
    coverImageUrl: "/tabr/home/images/group-cover.webp",
    inviteToken: "preview-token-culture",
    createdBy: "preview-user",
    createdAt: "2026-04-29T00:00:00.000Z",
  },
];

/**
 * Back-compat for GroupCreatedFlow (it still imports the singular constant).
 * Treat the first trip as the "just created" one.
 */
export const MOCK_EXISTING_HOME_TRIP = MOCK_EXISTING_HOME_TRIPS[0];

const avatarPool = [...FIGMA_USER_AVATAR_POOL];

function makeMembers(tripId: string, count: number): TripMember[] {
  return Array.from({ length: count }, (_, i) => {
    const avatarUrl = avatarPool[i % avatarPool.length];
    return {
      userId: `preview-${tripId}-m${i + 1}`,
      tripId,
      displayName: ["Alex", "Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Quinn"][
        i % 8
      ],
      avatarUrl,
      role: i === 0 ? "organizer" : "member",
      joinedAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    };
  });
}

export const MOCK_EXISTING_HOME_MEMBERS_BY_TRIP: Record<string, TripMember[]> = {
  [MOCK_EXISTING_HOME_TRIPS[0].id]: makeMembers(MOCK_EXISTING_HOME_TRIPS[0].id, 8),
  [MOCK_EXISTING_HOME_TRIPS[1].id]: makeMembers(MOCK_EXISTING_HOME_TRIPS[1].id, 4),
  [MOCK_EXISTING_HOME_TRIPS[2].id]: makeMembers(MOCK_EXISTING_HOME_TRIPS[2].id, 6),
  [MOCK_EXISTING_HOME_TRIPS[3].id]: makeMembers(MOCK_EXISTING_HOME_TRIPS[3].id, 8),
};

/** Figma trip counts per group card (preview only until API ships). */
export const MOCK_EXISTING_HOME_TRIP_COUNTS: Record<string, number> = {
  [MOCK_EXISTING_HOME_TRIPS[0].id]: 3,
  [MOCK_EXISTING_HOME_TRIPS[1].id]: 5,
  [MOCK_EXISTING_HOME_TRIPS[2].id]: 7,
  [MOCK_EXISTING_HOME_TRIPS[3].id]: 3,
};

// Back-compat: some older code may still import the singular members array.
export const MOCK_EXISTING_HOME_MEMBERS =
  MOCK_EXISTING_HOME_MEMBERS_BY_TRIP[MOCK_EXISTING_HOME_TRIP.id] ?? [];

export function getMockExistingHomeMembersByTrip(): Record<
  string,
  TripMember[]
> {
  return MOCK_EXISTING_HOME_MEMBERS_BY_TRIP;
}

export function getMockExistingHomeTrips(): Trip[] {
  return MOCK_EXISTING_HOME_TRIPS;
}

export function getMockExistingHomeTripCounts(): Record<string, number> {
  return MOCK_EXISTING_HOME_TRIP_COUNTS;
}
