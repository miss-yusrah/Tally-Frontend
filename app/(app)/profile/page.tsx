"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleUser,
  Globe,
  LogOut,
  Pencil,
} from "lucide-react";
import { CurrencyPickerSheet } from "@/features/auth";
import {
  DisplayNameSheet,
  SignOutConfirmSheet,
} from "@/features/profile";
import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import {
  useAuthStore,
  useAddToast,
  useBalanceStore,
  useBalancesFetchingAll,
  useExpenseStore,
  useOpenBottomSheet,
  useSettlementStore,
  useTripStore,
  useTrips,
  useTripsLoading,
  useUser,
} from "@/store";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

function formatStat(value: number | null): string {
  return value == null ? "—" : String(value);
}

function ProfileAvatar({
  name,
  userId,
  src,
}: {
  name: string;
  userId: string;
  src?: string;
}) {
  const initial = getMemberInitial(name);
  const bg = getAvatarColorForUser(userId);

  return (
    <div
      className="mx-auto h-[94px] w-[94px] rounded-full p-[3px]"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
      }}
    >
      <div className="h-full w-full overflow-hidden rounded-full bg-[#0A0A0F]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: bg }}
            aria-hidden
          >
            <span className="text-[32px] font-bold leading-none text-white">
              {initial}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({
  trips,
  expenses,
  settled,
}: {
  trips: number | null;
  expenses: number | null;
  settled: number | null;
}) {
  const blocks = [
    { label: "Trips", value: trips, accent: false },
    { label: "Expenses", value: expenses, accent: false },
    { label: "Settled", value: settled, accent: true },
  ] as const;

  return (
    <div
      className={cn(
        "grid h-20 grid-cols-3 items-center rounded-[16px] border border-[#ffffff0f] bg-[#13131A]",
        "shadow-[inset_0_1px_0_#ffffff0a]"
      )}
      aria-label="Profile stats"
    >
      {blocks.map((block, index) => (
        <div
          key={block.label}
          className={cn(
            "flex h-full flex-col items-center justify-center",
            index > 0 && "border-l border-[#ffffff0f]"
          )}
        >
          <span
            className={cn(
              "text-[20px] font-bold tabular-nums",
              block.accent ? "text-[#10B981]" : "text-[#F8F8FF]"
            )}
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {formatStat(block.value)}
          </span>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#475569]">
            {block.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
      {children}
    </p>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border border-[#ffffff0f] bg-[#13131A]",
        "shadow-[inset_0_1px_0_#ffffff0a]"
      )}
    >
      {children}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  chevron = true,
  destructive = false,
  onClick,
  showDivider = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  onClick: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? (
        <div className="h-px bg-[#ffffff0f]" aria-hidden />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-14 w-full items-center gap-3 px-4 text-left",
          "transition-colors duration-fast ease-tally",
          "hover:bg-[#1C1C27] active:bg-[#1C1C27]",
          focusRing
        )}
      >
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          {icon}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px] font-medium",
            destructive ? "text-[#F43F5E]" : "text-[#F8F8FF]"
          )}
        >
          {label}
        </span>
        {value ? (
          <span className="max-w-[120px] truncate text-[15px] font-medium text-[#94A3B8]">
            {value}
          </span>
        ) : null}
        {chevron ? (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[#475569]"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
      </button>
    </>
  );
}

export default function ProfilePage() {
  const user = useUser();
  const trips = useTrips();
  const tripsLoading = useTripsLoading();
  const expensesByTrip = useExpenseStore((s) => s.expensesByTrip);
  const settlementsByTrip = useSettlementStore((s) => s.settlementsByTrip);
  const isFetchingAll = useBalancesFetchingAll();
  const fetchTrips = useTripStore((s) => s.fetchTrips);
  const fetchAllTripBalances = useBalanceStore((s) => s.fetchAllTripBalances);
  const openBottomSheet = useOpenBottomSheet();
  const addToast = useAddToast();
  const updateHomeCurrency = useAuthStore((s) => s.updateHomeCurrency);
  const router = useRouter();

  const displayName = user?.displayName?.trim() || "Traveler";
  const email = user?.email ?? "";
  const homeCurrency = user?.homeCurrency ?? "USD";
  const userId = user?.id ?? "guest";
  const tripIdsKey = useMemo(() => trips.map((t) => t.id).join(","), [trips]);

  // Hydrate trips + expenses + settlements so stats reflect real activity.
  useEffect(() => {
    if (!user?.id || !user.onboardingComplete) return;
    void fetchTrips(user);
  }, [user?.id, user?.onboardingComplete, user, fetchTrips]);

  useEffect(() => {
    if (!user?.id || trips.length === 0) return;
    void fetchAllTripBalances(user.id);
  }, [user?.id, tripIdsKey, fetchAllTripBalances, trips.length]);

  const stats = useMemo(() => {
    const tripsHydrating = tripsLoading;
    const activityHydrating =
      trips.length > 0 &&
      (isFetchingAll ||
        trips.some(
          (t) => !(t.id in expensesByTrip) || !(t.id in settlementsByTrip)
        ));

    const tripsCount = tripsHydrating ? null : trips.length;

    let expensesCount: number | null;
    if (tripsHydrating || activityHydrating) {
      expensesCount = null;
    } else if (trips.length === 0) {
      expensesCount = 0;
    } else {
      expensesCount = trips.reduce(
        (sum, trip) => sum + (expensesByTrip[trip.id]?.length ?? 0),
        0
      );
    }

    let settledCount: number | null;
    if (tripsHydrating || activityHydrating) {
      settledCount = null;
    } else if (trips.length === 0) {
      settledCount = 0;
    } else {
      settledCount = trips.reduce(
        (sum, trip) =>
          sum +
          (settlementsByTrip[trip.id]?.filter((s) => !s._optimistic).length ??
            0),
        0
      );
    }

    return { tripsCount, expensesCount, settledCount };
  }, [
    trips,
    tripsLoading,
    isFetchingAll,
    expensesByTrip,
    settlementsByTrip,
  ]);

  const openDisplayName = () => {
    openBottomSheet(
      <DisplayNameSheet currentName={user?.displayName ?? ""} />,
      { title: "Display name", height: "40" }
    );
  };

  const openHomeCurrency = () => {
    openBottomSheet(
      <CurrencyPickerSheet
        selectedCode={homeCurrency}
        onSelect={async (c) => {
          const ok = await updateHomeCurrency(c.code);
          if (!ok) {
            addToast({
              message: "Couldn't update home currency. Please try again.",
              variant: "error",
            });
            return;
          }
          addToast({
            message: "Home currency updated",
            variant: "success",
          });
        }}
      />,
      { title: "Home currency", height: "75" }
    );
  };

  const openSignOut = () => {
    openBottomSheet(<SignOutConfirmSheet />, { height: "40" });
  };

  const onNotifications = () => {
    router.push("/notifications");
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0A0A0F] pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle 340px at 195px 100px, rgba(124, 58, 237, 0.12), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-6 pb-2 pt-4 safe-top">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#475569]">
          Account
        </p>
        <h1 className="mt-0.5 text-[28px] font-bold tracking-[-0.01em] text-[#F8F8FF]">
          Profile
        </h1>
      </header>

      <div className="relative z-10 flex flex-1 flex-col px-6">
        {/* Avatar zone */}
        <div className="mt-6 flex flex-col items-center">
          <ProfileAvatar
            name={displayName}
            userId={userId}
            src={user?.avatarUrl}
          />

          <div className="mt-3 flex items-center justify-center gap-1.5">
            <h2 className="text-center text-[22px] font-bold text-[#F8F8FF]">
              {displayName}
            </h2>
            <button
              type="button"
              onClick={openDisplayName}
              aria-label="Edit display name"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[#475569]",
                "transition-colors duration-fast ease-tally hover:text-[#94A3B8]",
                focusRing
              )}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {email ? (
            <p className="mt-1 text-center text-[14px] font-normal text-[#94A3B8]">
              {email}
            </p>
          ) : null}
        </div>

        {/* Stats */}
        <div className="mt-5">
          <StatsCard
            trips={stats.tripsCount}
            expenses={stats.expensesCount}
            settled={stats.settledCount}
          />
        </div>

        {/* Preferences */}
        <section className="mt-6" aria-label="Preferences">
          <SectionLabel>Preferences</SectionLabel>
          <SettingsCard>
            <SettingsRow
              icon={
                <Globe
                  className="h-[18px] w-[18px] text-[#7C3AED]"
                  strokeWidth={2}
                />
              }
              label="Home currency"
              value={homeCurrency}
              onClick={openHomeCurrency}
            />
            <SettingsRow
              icon={
                <CircleUser
                  className="h-[18px] w-[18px] text-[#7C3AED]"
                  strokeWidth={2}
                />
              }
              label="Display name"
              value={displayName}
              onClick={openDisplayName}
              showDivider
            />
          </SettingsCard>
        </section>

        {/* Account */}
        <section className="mt-5" aria-label="Account">
          <SectionLabel>Account</SectionLabel>
          <SettingsCard>
            <SettingsRow
              icon={
                <Bell
                  className="h-[18px] w-[18px] text-[#94A3B8]"
                  strokeWidth={2}
                />
              }
              label="Notifications"
              onClick={onNotifications}
            />
            <SettingsRow
              icon={
                <LogOut
                  className="h-[18px] w-[18px] text-[#F43F5E]"
                  strokeWidth={2}
                />
              }
              label="Sign out"
              chevron={false}
              destructive
              onClick={openSignOut}
              showDivider
            />
          </SettingsCard>
        </section>

        <p className="mt-auto pb-4 pt-12 text-center text-[12px] font-normal text-[#475569]">
          Tally v1.0
        </p>
      </div>
    </div>
  );
}
