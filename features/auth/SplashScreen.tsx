"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { bricolage } from "@/lib/fonts";
import { useAuthStore, type AuthUser } from "@/store/authStore";

/** Keep in sync with `.splash-logo-spin-active` in globals.css */
const SPIN_MS = 4500;

/** Extrusion slices along Z — solid thickness when edge-on (not a paper cutout). */
const LOGO_SLICES = 18;

function destinationForUser(user: AuthUser | null) {
  if (!user) return "/onboarding";
  if (!user.onboardingComplete) return "/onboarding/setup";
  return "/dashboard";
}

function SplashLogo3D() {
  const last = LOGO_SLICES - 1;
  const half = last / 2;

  return (
    <div className="splash-logo-extrude">
      {Array.from({ length: LOGO_SLICES }, (_, i) => {
        const t = i / last;
        const isFront = i === 0;
        return (
          <div
            key={i}
            className={
              isFront ? "splash-logo-slice splash-logo-slice-front" : "splash-logo-slice"
            }
            style={
              {
                "--z": half - i,
                "--t": t,
              } as CSSProperties
            }
          >
            {isFront ? (
              <Image
                src="/tabr/brand/logo.webp"
                alt=""
                width={84}
                height={84}
                priority
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function SplashScreen() {
  const left = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (left.current) return;
      left.current = true;
      const href = destinationForUser(useAuthStore.getState().user);
      window.location.replace(href);
    }, SPIN_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <main
      data-spin-ms={SPIN_MS}
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#221C2B]"
      aria-label="Tabr"
      aria-busy
    >
      <div className="flex flex-col items-center gap-5">
        <div className="splash-logo-stage" aria-hidden>
          <div className="splash-logo-spin splash-logo-spin-active">
            <SplashLogo3D />
          </div>
        </div>

        <h1
          className={`${bricolage.className} overflow-visible`}
          style={{
            color: "var(--primary-500, #5921B5)",
            fontSize: "60.113px",
            fontWeight: 700,
            fontStyle: "normal",
            lineHeight: "43.958px",
            letterSpacing: "-1.202px",
            paddingBlock: "8px",
          }}
        >
          Tabr
        </h1>
      </div>
    </main>
  );
}
