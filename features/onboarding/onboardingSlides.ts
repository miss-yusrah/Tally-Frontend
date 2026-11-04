export interface OnboardingSlide {
  id: number;
  backgroundSrc: string;
  /** Figma line breaks — headline box is 224×60 */
  headlineLines: [string, string];
  body: string;
  /** Fine-tune photo crop per slide */
  imagePosition?: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 0,
    backgroundSrc: "/tabr/onboarding/slide-1-bg.webp",
    headlineLines: ["Plan the vibe", "with your crew"],
    body: "Pick a place, set a date, and bring everyone into the plan",
    imagePosition: "50% 42%",
  },
  {
    id: 1,
    backgroundSrc: "/tabr/onboarding/slide-2-bg.webp",
    headlineLines: ["Get everyone on", "the same page"],
    body: "Share ideas, vote on plans, and keep every detail in one place",
    imagePosition: "50% 38%",
  },
  {
    id: 2,
    backgroundSrc: "/tabr/onboarding/slide-3-bg.webp",
    /** Figma: 224px heading-2 box — "Make the plan" / "happen" */
    headlineLines: ["Make the plan", "happen"],
    body: "Show up as a crew, have fun, and make memories together",
    /** Keep faces mid-upper; table / drinks sit under the bottom scrim */
    imagePosition: "50% 32%",
  },
];

export const ONBOARDING_SLIDE_COUNT = ONBOARDING_SLIDES.length;

/** Figma frame width */
export const ONBOARDING_FRAME_WIDTH_PX = 393;
