"use client";

import { Check } from "lucide-react";

const AVATARS = {
  left: {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    enterDelay: 100,
    floatDelay: 600,
  },
  center: {
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
    enterDelay: 250,
    floatDelay: 750,
  },
  right: {
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    enterDelay: 380,
    floatDelay: 880,
  },
} as const;

function AvatarImg({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={80}
      height={80}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      className="block h-20 w-20 rounded-full border-[3px] border-[#0A0A0F] object-cover"
    />
  );
}

export function HeroMotion() {
  return (
    <div className="relative flex h-[200px] w-full items-center justify-center">
      {/* Soft glow — anchored to the avatar cluster, not the viewport */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Cluster — floats freely, no enclosing ring */}
      <div className="relative h-[88px] w-[232px]">
        {/* Left */}
        <div
          className="hero-avatar-float hero-float-a absolute bottom-0 left-0 z-10"
          style={{ animationDelay: `${AVATARS.left.floatDelay}ms` }}
        >
          <div
            className="hero-avatar-enter"
            style={{ animationDelay: `${AVATARS.left.enterDelay}ms` }}
          >
            <AvatarImg src={AVATARS.left.src} alt="Trip member" />
          </div>
        </div>

        {/* Center — forward & elevated */}
        <div
          className="hero-avatar-float hero-float-b absolute left-1/2 top-0 z-30 -translate-x-1/2"
          style={{ animationDelay: `${AVATARS.center.floatDelay}ms` }}
        >
          <div
            className="hero-avatar-enter relative"
            style={{ animationDelay: `${AVATARS.center.enterDelay}ms` }}
          >
            <AvatarImg src={AVATARS.center.src} alt="Trip member" />
            <div
              className="hero-checkmark-badge absolute flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#0A0A0F] bg-[#10B981]"
              style={{ bottom: -8, right: -8 }}
              aria-hidden
            >
              <Check className="h-[14px] w-[14px] text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Right */}
        <div
          className="hero-avatar-float hero-float-c absolute bottom-0 right-0 z-20"
          style={{ animationDelay: `${AVATARS.right.floatDelay}ms` }}
        >
          <div
            className="hero-avatar-enter"
            style={{ animationDelay: `${AVATARS.right.enterDelay}ms` }}
          >
            <AvatarImg src={AVATARS.right.src} alt="Trip member" />
          </div>
        </div>
      </div>
    </div>
  );
}
