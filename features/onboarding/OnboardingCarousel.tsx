"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingSlide } from "./onboardingSlides";
import { ONBOARDING_SLIDES } from "./onboardingSlides";
import { OnboardingPagination } from "./OnboardingPagination";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/store";

const SWIPE_THRESHOLD_PX = 48;

function SlideBackground({
  slide,
  isActive,
  isFirst,
}: {
  slide: OnboardingSlide;
  isActive: boolean;
  /** Only the first slide is a real LCP candidate — later slides load lazily
   * and are warmed during the 500ms cross-fade window. */
  isFirst: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-500 ease-out",
        isActive ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!isActive}
    >
      <Image
        src={slide.backgroundSrc}
        alt=""
        fill
        priority={isFirst}
        loading={isFirst ? "eager" : "lazy"}
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: slide.imagePosition ?? "50% 40%" }}
        quality={90}
      />

      {/* Soft bottom blur — matches Figma frosted text area (no home indicator) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%]"
        style={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          maskImage:
            "linear-gradient(to top, black 55%, rgba(0,0,0,0.45) 78%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 55%, rgba(0,0,0,0.45) 78%, transparent 100%)",
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 34%, rgba(0,0,0,0.16) 50%, rgba(0,0,0,0.48) 70%, rgba(0,0,0,0.78) 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}

function SlideCopy({
  slide,
  isActive,
}: {
  slide: OnboardingSlide;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "transition-opacity duration-300 ease-out",
        isActive
          ? "relative opacity-100"
          : "pointer-events-none absolute inset-0 opacity-0"
      )}
      aria-hidden={!isActive}
    >
      <h1 className="text-tabr-heading-2">
        {slide.headlineLines[0]}
        <br />
        {slide.headlineLines[1]}
      </h1>
      <p className="text-tabr-paragraph-small mt-3 w-full">{slide.body}</p>
    </div>
  );
}

export function OnboardingCarousel() {
  const router = useRouter();
  const markIntroCompleted = useOnboardingStore((s) => s.markIntroCompleted);
  const activeSlide = useOnboardingStore((s) => s.activeSlide);
  const setActiveSlide = useOnboardingStore((s) => s.setActiveSlide);

  const pointerStartX = useRef<number | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const goToSignUp = useCallback(() => {
    setIsExiting(true);
    markIntroCompleted();
    window.setTimeout(() => {
      router.push("/sign-up");
    }, 180);
  }, [markIntroCompleted, router]);

  const goToSignIn = useCallback(() => {
    markIntroCompleted();
    router.push("/sign-in");
  }, [markIntroCompleted, router]);

  const goToNeighbor = useCallback(
    (direction: -1 | 1) => {
      const next = activeSlide + direction;
      if (next < 0 || next >= ONBOARDING_SLIDES.length) return;
      setActiveSlide(next);
    },
    [activeSlide, setActiveSlide]
  );

  /** Pointer events cover touch + mouse + trackpad drag on laptop */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a, input")) return;
    pointerStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;

    if (delta < 0) goToNeighbor(1);
    else goToNeighbor(-1);
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goToNeighbor(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goToNeighbor(-1);
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Onboarding"
      tabIndex={0}
      className={cn(
        "relative min-h-dvh w-full touch-pan-y overflow-hidden bg-black outline-none",
        isDragging ? "cursor-grabbing select-none" : "cursor-grab",
        isExiting && "opacity-0 transition-opacity duration-200"
      )}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      {/* Backgrounds — crossfade; no fake status bar / home indicator */}
      <div className="absolute inset-0">
        {ONBOARDING_SLIDES.map((slide, index) => (
          <SlideBackground
            key={slide.id}
            slide={slide}
            isActive={slide.id === activeSlide}
            isFirst={index === 0}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="flex-1" />

        <div className="flex flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="relative min-h-[9.5rem]">
            {ONBOARDING_SLIDES.map((slide) => (
              <SlideCopy
                key={slide.id}
                slide={slide}
                isActive={slide.id === activeSlide}
              />
            ))}
          </div>

          <OnboardingPagination
            className="mt-5"
            count={ONBOARDING_SLIDES.length}
            activeIndex={activeSlide}
            onSelect={setActiveSlide}
          />

          <button
            type="button"
            onClick={goToSignUp}
            className={cn(
              "mt-5 flex h-[52px] w-full items-center justify-center rounded-full",
              "bg-[var(--primary-500,#5921B5)] text-[16px] font-semibold leading-none text-white",
              "transition-[transform,background-color] duration-150",
              "hover:bg-[#4A1C96] active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            )}
          >
            Get started
          </button>

          <button
            type="button"
            onClick={goToSignIn}
            className={cn(
              "mt-3 w-full py-1 text-center text-[15px] font-normal text-white",
              "underline decoration-white underline-offset-[3px]",
              "active:opacity-75"
            )}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
