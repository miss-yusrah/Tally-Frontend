import type { TripMember } from "@/types";

export function settlementDisplayName(
  member: TripMember | undefined,
  userId: string,
  currentUserId?: string
): string {
  if (userId === currentUserId) return "You";
  const full = member?.displayName?.trim();
  if (!full) return "Member";
  const parts = full.split(" ");
  if (parts.length >= 2) return `${parts[0]} ${parts[1].charAt(0)}.`;
  return full;
}
