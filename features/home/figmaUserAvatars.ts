/**
 * Shared member faces — public/tabr/home/avatars/
 * Hero stack: 14 → 15 → 18 → 21 → 14
 */
export const FIGMA_USER_AVATARS = {
  a14: "/tabr/home/avatars/14.webp",
  a15: "/tabr/home/avatars/15.webp",
  a18: "/tabr/home/avatars/18.webp",
  a21: "/tabr/home/avatars/21.webp",
} as const;

/** Rotating pool for overlapping stacks on group cards / hero. */
export const FIGMA_USER_AVATAR_POOL = [
  FIGMA_USER_AVATARS.a14,
  FIGMA_USER_AVATARS.a15,
  FIGMA_USER_AVATARS.a18,
  FIGMA_USER_AVATARS.a21,
] as const;

/** Overlapping hero cluster on group detail + home cards. */
export const FIGMA_HERO_AVATAR_CLUSTER = [
  FIGMA_USER_AVATARS.a14,
  FIGMA_USER_AVATARS.a15,
  FIGMA_USER_AVATARS.a18,
  FIGMA_USER_AVATARS.a21,
  FIGMA_USER_AVATARS.a14,
] as const;

export function figmaUserAvatarAt(index: number): string {
  return FIGMA_USER_AVATAR_POOL[index % FIGMA_USER_AVATAR_POOL.length];
}
