"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
// Direct module imports — avoids pulling the whole home feature barrel
// (NewUserHome, ExploreEntryScreen, mock data, …) into the shared layout chunk.
import { LightHomeNav } from "@/features/home/LightHomeNav";
import { useLightHomeChrome } from "@/features/home/useLightHomeChrome";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

interface MobileShellProps {
  children: ReactNode;
  showNav?: boolean;
}

// Full-screen sub-flows that manage their own header + pinned CTA.
function isImmersiveRoute(pathname: string): boolean {
  return (
    pathname === "/trips/new" ||
    pathname === "/trips/new/cover" ||
    pathname === "/profile/edit" ||
    pathname === "/profile/password" ||
    pathname === "/profile/kyc" ||
    pathname === "/profile/help" ||
    pathname === "/profile/language" ||
    pathname === "/profile/notifications" ||
    pathname === "/profile/review" ||
    pathname === "/profile/review/survey" ||
    pathname === "/profile/review/survey/complete" ||
    pathname === "/wallet/transfer" ||
    pathname === "/wallet/history" ||
    /^\/trips\/[^/]+\/trips\/new(\/[^/]+)?(\/(group|customise))?$/.test(pathname) ||
    /^\/trips\/[^/]+\/outings\/[^/]+$/.test(pathname) ||
    /^\/trips\/[^/]+\/outings\/[^/]+\/expenses(\/(scan|new|split(\/(equal|items|success))?))?$/.test(
      pathname
    ) ||
    /^\/trips\/[^/]+\/invite$/.test(pathname) ||
    /^\/trips\/[^/]+\/expenses\/new$/.test(pathname) ||
    /^\/trips\/[^/]+\/expenses\/[^/]+$/.test(pathname)
  );
}

export function MobileShell({ children, showNav = true }: MobileShellProps) {
  const pathname = usePathname();
  const navVisible = showNav && !isImmersiveRoute(pathname);
  const lightHome = useLightHomeChrome();

  return (
    <div
      className={cn(
        "phone-shell mobile-frame flex flex-col",
        lightHome && "mobile-frame-light bg-[#FAFAFA]"
      )}
    >
      <main
        className={
          navVisible
            ? cn(
                "flex min-h-0 flex-1 flex-col overflow-x-clip",
                lightHome ? "pb-24" : "pb-20"
              )
            : "min-h-0 flex-1 overflow-x-clip"
        }
      >
        {children}
      </main>
      {navVisible && (lightHome ? <LightHomeNav /> : <BottomNav />)}
    </div>
  );
}
