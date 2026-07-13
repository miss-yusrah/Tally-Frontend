"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Plus, Scale, User } from "lucide-react";
import { AddExpenseChoiceSheet } from "@/features/expenses/AddExpenseChoiceSheet";
import { cn } from "@/lib/utils";
import { useActiveTrip, useOpenBottomSheet } from "@/store";

const tabs = [
  { href: "/dashboard", label: "Trips", icon: Map },
  { href: "/trips/new", label: "Add", icon: Plus, isFab: true },
  { href: "/balances", label: "Balances", icon: Scale },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const activeTrip = useActiveTrip();
  const openBottomSheet = useOpenBottomSheet();

  const onTripContext = Boolean(activeTrip && pathname.startsWith("/trips/"));
  const onTripBalancesRoute = /^\/trips\/[^/]+\/balances$/.test(pathname);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "border-t border-[#ffffff0a] bg-[#13131A]/90",
        "backdrop-blur-[20px]",
        "safe-bottom"
      )}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-mobile items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard" ||
                (pathname.startsWith("/trips") && !onTripBalancesRoute)
              : tab.href === "/balances"
                ? pathname.startsWith("/balances") || onTripBalancesRoute
                : pathname.startsWith(tab.href);

          if ("isFab" in tab && tab.isFab) {
            const fabClasses = cn(
              "relative -mt-6 flex h-14 w-14 items-center justify-center",
              "rounded-full bg-accent-gradient",
              // Dark ring lifts the FAB off the glass bar; inner glow blooms out
              "ring-[2px] ring-[#0A0A0F] shadow-[0_0_20px_#7C3AED60]",
              "transition-transform duration-fast ease-tally active:scale-95"
            );

            if (onTripContext && activeTrip) {
              return (
                <button
                  key={tab.href}
                  type="button"
                  onClick={() =>
                    openBottomSheet(
                      <AddExpenseChoiceSheet tripId={activeTrip.id} />,
                      { height: "40" }
                    )
                  }
                  className={fabClasses}
                  aria-label="Add expense"
                >
                  <tab.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href="/trips/new"
                className={fabClasses}
                aria-label="New trip"
              >
                <tab.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1",
                "transition-colors duration-fast ease-tally",
                isActive ? "text-[#F8F8FF]" : "text-[#475569]"
              )}
            >
              {/* Active pill sits ABOVE the icon — more distinctive than an underline */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -top-1 left-1/2 h-4 w-[3px] -translate-x-1/2 rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, #7C3AED 0%, #2563EB 100%)",
                  }}
                />
              )}
              <tab.icon
                className="h-5 w-5"
                strokeWidth={isActive ? 2.25 : 2}
              />
              <span
                className={cn(
                  "text-[11px]",
                  isActive ? "font-semibold" : "font-normal"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
