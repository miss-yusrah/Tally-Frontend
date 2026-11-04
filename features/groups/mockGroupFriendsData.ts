import type { Trip, TripMember } from "@/types";
import { FIGMA_HERO_AVATAR_CLUSTER } from "@/features/home/figmaUserAvatars";
import {
  getMockExistingHomeMembersByTrip,
  getMockExistingHomeTripCounts,
  getMockExistingHomeTrips,
  MOCK_EXISTING_HOME_TRIP,
} from "@/features/home/mockExistingHomeData";

export interface GroupMemberView {
  member: TripMember;
  email: string;
}

export interface GroupTripView {
  id: string;
  groupId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverSrc: string;
  /** Figma badge — defaults from startDate when omitted */
  status?: "upcoming" | "past";
  /** When set, card opens outing details instead of nested itinerary */
  outingHref?: string;
}

const PREVIEW_MEMBER_EMAILS: Record<string, string> = {
  "preview-aniekan": "aniekananiekan@quietly.com",
  "preview-mark": "markplus@loopai.com",
  "preview-daniel": "staff.engineer@loopai.com",
  "preview-ruth": "ruth.lee@google.com",
  "preview-alex": "alex@quietly.com",
  "preview-sam": "sam@quietly.com",
  "preview-jordan": "jordan@quietly.com",
  "preview-casey": "casey@quietly.com",
};

/** Figma trip count on group detail hero (may differ from home card). */
const PREVIEW_GROUP_DETAIL_TRIP_COUNTS: Record<string, number> = {
  "preview-trip-my-day-ones": 2,
};

/** Friends-list row photos — public/tabr/home/images/users/ */
export const MEMBER_AVATARS = {
  aniekan: "/tabr/home/images/users/Ellipse%2058.webp",
  mark: "/tabr/home/images/users/Ellipse%2058%20(1).webp",
  daniel: "/tabr/home/images/users/Ellipse%2058%20(2).webp",
  ruth: "/tabr/home/images/users/Ellipse%2058%20(3).webp",
} as const;

/** Figma-accurate members for preview group detail (My Day Ones). */
export const PREVIEW_GROUP_FRIENDS_MEMBERS: GroupMemberView[] = [
  {
    member: {
      userId: "preview-aniekan",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Aniekan Aniekan",
      avatarUrl: MEMBER_AVATARS.aniekan,
      role: "organizer",
      joinedAt: "2026-01-01T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-aniekan"],
  },
  {
    member: {
      userId: "preview-mark",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Mark Pius",
      avatarUrl: MEMBER_AVATARS.mark,
      role: "member",
      joinedAt: "2026-01-02T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-mark"],
  },
  {
    member: {
      userId: "preview-daniel",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Daniel Dressco",
      avatarUrl: MEMBER_AVATARS.daniel,
      role: "member",
      joinedAt: "2026-01-03T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-daniel"],
  },
  {
    member: {
      userId: "preview-ruth-a",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Ruth Lee",
      avatarUrl: MEMBER_AVATARS.ruth,
      role: "member",
      joinedAt: "2026-01-04T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-ruth"],
  },
  {
    member: {
      userId: "preview-ruth-b",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Ruth Lee",
      avatarUrl: MEMBER_AVATARS.ruth,
      role: "member",
      joinedAt: "2026-01-05T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-ruth"],
  },
  {
    member: {
      userId: "preview-alex",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Alex Morgan",
      avatarUrl: MEMBER_AVATARS.aniekan,
      role: "member",
      joinedAt: "2026-01-06T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-alex"],
  },
  {
    member: {
      userId: "preview-sam",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Sam Okoro",
      avatarUrl: MEMBER_AVATARS.mark,
      role: "member",
      joinedAt: "2026-01-07T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-sam"],
  },
  {
    member: {
      userId: "preview-jordan",
      tripId: MOCK_EXISTING_HOME_TRIP.id,
      displayName: "Jordan Kim",
      avatarUrl: MEMBER_AVATARS.daniel,
      role: "member",
      joinedAt: "2026-01-08T00:00:00.000Z",
    },
    email: PREVIEW_MEMBER_EMAILS["preview-jordan"],
  },
];

/** Hero avatar stack — public/tabr/home/avatars. */
export const HERO_AVATAR_CLUSTER = FIGMA_HERO_AVATAR_CLUSTER;

export const GROUP_HERO_COVER = "/tabr/home/images/friends2.webp";

export function isPreviewGroupTripId(tripId: string): boolean {
  return tripId.startsWith("preview-");
}

export function getPreviewGroupTrip(tripId: string): Trip | null {
  return getMockExistingHomeTrips().find((trip) => trip.id === tripId) ?? null;
}

export function getPreviewGroupFriendsMembers(
  tripId: string
): GroupMemberView[] {
  if (tripId === MOCK_EXISTING_HOME_TRIP.id) {
    return PREVIEW_GROUP_FRIENDS_MEMBERS;
  }

  const members = getMockExistingHomeMembersByTrip()[tripId] ?? [];
  return members.map((member) => ({
    member,
    email: emailFromDisplayName(member.displayName),
  }));
}

export function getPreviewGroupTripCount(tripId: string): number {
  if (tripId in PREVIEW_GROUP_DETAIL_TRIP_COUNTS) {
    return PREVIEW_GROUP_DETAIL_TRIP_COUNTS[tripId];
  }
  return getMockExistingHomeTripCounts()[tripId] ?? 1;
}

export function membersToGroupViews(members: TripMember[]): GroupMemberView[] {
  return members.map((member) => ({
    member,
    email: emailFromDisplayName(member.displayName),
  }));
}

function emailFromDisplayName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${slug || "member"}@quietly.com`;
}

const GROUP_TRIP_COVER = "/tabr/home/images/painting.webp";
const TRIP_CARD = (n: 1 | 2 | 3 | 4 | 5) =>
  `/tabr/Trip cards/Trip card ${n}.webp`;
const TRIP_LOCATION = "/tabr/Trip cards/trip location.webp";

export interface GroupEventView {
  id: string;
  tripId: string;
  name: string;
  startDate: string;
  endDate: string;
  coverSrc: string;
}

/** Figma trip cards on the group Trips tab (My Day Ones) — place outings. */
export const PREVIEW_GROUP_TRIPS: GroupTripView[] = [
  {
    id: "preview-outing-cafe-alyanto",
    groupId: MOCK_EXISTING_HOME_TRIP.id,
    name: "Cafe Alyanto",
    destination: "Lekki, Lagos",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    coverSrc: TRIP_LOCATION,
    status: "upcoming",
  },
  {
    id: "preview-outing-la-tropicana",
    groupId: MOCK_EXISTING_HOME_TRIP.id,
    name: "La Tropicana",
    destination: "Ilupeju, Lagos",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    coverSrc: TRIP_CARD(4),
    status: "past",
  },
];

export const PREVIEW_GROUP_EVENTS: GroupEventView[] = [
  {
    id: "preview-event-dinner-luxe",
    tripId: "preview-outing-cafe-alyanto",
    name: "Dinner at Luxe",
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    coverSrc: GROUP_TRIP_COVER,
  },
];

export function getPreviewGroupTrips(tripId: string): GroupTripView[] {
  if (tripId === MOCK_EXISTING_HOME_TRIP.id) return PREVIEW_GROUP_TRIPS;
  return [];
}

export function getPreviewNestedTrip(itemId: string): GroupTripView | null {
  return PREVIEW_GROUP_TRIPS.find((trip) => trip.id === itemId) ?? null;
}

export function getPreviewTripEvents(itemId: string): GroupEventView[] {
  return PREVIEW_GROUP_EVENTS.filter((event) => event.tripId === itemId);
}

/** Seeded outing details for Figma Trips-tab cards (until API). */
export function getPreviewOutingDraft(
  outingId: string
): import("@/store/createdTripDraftStore").CreatedTripDraft | null {
  const trip = getPreviewNestedTrip(outingId);
  if (!trip) return null;

  const isCafe = outingId.includes("cafe");
  return {
    id: trip.id,
    name: isCafe ? "Coffee date" : trip.name,
    groupId: trip.groupId,
    groupName: "My Day Ones",
    friendCount: 8,
    avatarSrcs: [...FIGMA_HERO_AVATAR_CLUSTER],
    placeId: isCafe ? "cafe-alyanto" : "la-tropicana",
    placeName: trip.name,
    area: trip.destination.split(",")[0]?.trim() || trip.destination,
    city: "Lagos",
    rating: 4.5,
    reviewCount: 60,
    priceLabel: isCafe ? "~ N10,000/person" : "~ N12,000/person",
    imageSrc: trip.coverSrc,
    date: trip.startDate,
    time: isCafe ? "20:00" : "10:30",
    address: isCafe
      ? "Flowershop Cafe, Store 2:, 274 Akin Adesola St, Victoria Island, Lagos 106104, Lagos"
      : `${trip.destination}`,
  };
}
