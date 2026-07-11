"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Receipt } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  getCategoryConfig,
} from "@/features/expenses/categoryConfig";
import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import { formatCurrency } from "@/lib/currency";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import {
  useActiveTrip,
  useExpenseStore,
  useTripMembers,
  useTripStore,
  useTrips,
} from "@/store";
import type { Expense } from "@/types";

interface ExpenseDetailPageProps {
  params: { tripId: string; expenseId: string };
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

function formatAbsoluteDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MemberAvatar({
  userId,
  name,
  size = "md",
}: {
  userId: string;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-[13px]" : "h-10 w-10 text-[15px]";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-[#F8F8FF]",
        dim
      )}
      style={{ backgroundColor: getAvatarColorForUser(userId) }}
      aria-hidden
    >
      {getMemberInitial(name)}
    </div>
  );
}

export default function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { tripId, expenseId } = params;
  const activeTrip = useActiveTrip();
  const trips = useTrips();
  const members = useTripMembers();
  const getExpense = useExpenseStore((s) => s.getExpense);
  const fetchTripDetail = useTripStore((s) => s.fetchTripDetail);

  const trip =
    activeTrip?.id === tripId
      ? activeTrip
      : trips.find((t) => t.id === tripId) ?? null;

  const [expense, setExpense] = useState<Expense | null>(() => {
    const cached =
      useExpenseStore.getState().expensesByTrip[tripId]?.find(
        (e) => e.id === expenseId
      ) ?? null;
    return cached;
  });
  const [loading, setLoading] = useState(!expense);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void fetchTripDetail(tripId, { silent: true });
  }, [tripId, fetchTripDetail]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const fromCache = useExpenseStore
        .getState()
        .expensesByTrip[tripId]?.find((e) => e.id === expenseId);

      if (fromCache && !fromCache._optimistic) {
        setExpense(fromCache);
        setLoading(false);
        setNotFound(false);
      } else {
        setLoading(true);
      }

      const fetched = await getExpense(tripId, expenseId);
      if (cancelled) return;

      if (fetched) {
        setExpense(fetched);
        setNotFound(false);
      } else if (!fromCache) {
        setNotFound(true);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, expenseId, getExpense]);

  const memberName = (userId: string) =>
    members.find((m) => m.userId === userId)?.displayName ?? "Member";

  const categoryConfig =
    getCategoryConfig(expense?.category) ??
    EXPENSE_CATEGORIES.find((c) => c.id === "other")!;
  const CategoryIcon = categoryConfig.icon;
  const accent = categoryConfig.color;

  const payerName = expense ? memberName(expense.payerId) : "";
  const title =
    expense?.note?.trim() ||
    (payerName ? `${payerName.split(" ")[0]} paid` : "Expense");

  const splitRows = useMemo(() => {
    if (!expense) return [];
    const total = expense.amountMinorUnits || 1;
    const nameFor = (userId: string) =>
      members.find((m) => m.userId === userId)?.displayName ?? "Member";
    return [...expense.splitMap]
      .sort((a, b) => b.amountMinorUnits - a.amountMinorUnits)
      .map((split) => ({
        ...split,
        name: nameFor(split.userId),
        share: Math.round((split.amountMinorUnits / total) * 100),
      }));
  }, [expense, members]);

  const showBaseConversion =
    expense && trip && expense.currency !== trip.baseCurrency;

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0F]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !expense) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#0A0A0F]">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#ffffff0f] bg-[#0A0A0F] safe-top">
          <Link
            href={`/trips/${tripId}`}
            aria-label="Back to trip"
            className={cn(
              "ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
              "transition-colors hover:bg-[#1C1C27]",
              focusRing
            )}
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Receipt className="h-10 w-10 text-[#475569]" strokeWidth={1.5} />
          <p className="mt-4 text-[16px] font-semibold text-[#F8F8FF]">
            Expense not found
          </p>
          <p className="mt-1.5 max-w-[260px] text-[14px] text-[#94A3B8]">
            It may still be saving, or it was removed from this trip.
          </p>
          <Link
            href={`/trips/${tripId}`}
            className={cn(
              "mt-6 text-[14px] font-semibold text-[#7C3AED]",
              focusRing
            )}
          >
            Back to trip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0A0A0F]">
      {/* Category atmosphere — edge-to-edge glow, not a card */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% -10%, ${accent}33 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      <header className="relative z-30 sticky top-0 flex h-16 items-center safe-top">
        <Link
          href={`/trips/${tripId}`}
          aria-label="Back to trip"
          className={cn(
            "ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
            "transition-colors hover:bg-[#1C1C27]",
            focusRing
          )}
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="pointer-events-none absolute inset-x-0 truncate px-16 text-center text-[17px] font-semibold text-[#F8F8FF]">
          {title}
        </h1>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto pb-10">
        {/* Hero */}
        <div className="flex flex-col items-center px-6 pt-4 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[18px]"
            style={{ backgroundColor: `${accent}26` }}
          >
            <CategoryIcon
              className="h-7 w-7"
              style={{ color: accent }}
              strokeWidth={2}
            />
          </div>

          <p
            className="mt-6 tabular-nums text-[44px] font-bold leading-none tracking-tight text-[#F8F8FF]"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {formatCurrency(expense.amountMinorUnits, expense.currency)}
          </p>

          {showBaseConversion && trip && (
            <p
              className="mt-2 tabular-nums text-[14px] font-medium text-[#94A3B8]"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              ≈ {formatCurrency(expense.baseCurrencyAmount, trip.baseCurrency)}{" "}
              trip base
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-[#1C1C27] px-3 py-1 text-[12px] font-semibold text-[#F8F8FF]">
              {categoryConfig.label}
            </span>
            <span className="rounded-full bg-[#1C1C27] px-3 py-1 text-[12px] font-medium text-[#94A3B8]">
              {expense.splitMethod === "equal" ? "Split equally" : "Custom split"}
            </span>
          </div>

          <p
            className="mt-3 text-[13px] font-normal text-[#94A3B8] tabular-nums"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {formatRelativeTime(expense.createdAt)}
            <span className="mx-1.5 text-[#475569]">·</span>
            {formatAbsoluteDate(expense.createdAt)}
          </p>
        </div>

        {/* Paid by */}
        <section className="mt-10 px-6">
          <p className="mb-3 text-[13px] font-medium text-[#94A3B8]">Paid by</p>
          <div className="flex items-center border-y border-[#ffffff0f] py-3.5">
            <MemberAvatar userId={expense.payerId} name={payerName} />
            <div className="ml-3 min-w-0 flex-1 text-left">
              <p className="truncate text-[16px] font-medium text-[#F8F8FF]">
                {payerName}
              </p>
              <p className="mt-0.5 text-[13px] text-[#94A3B8]">Covered the bill</p>
            </div>
            <p
              className="shrink-0 tabular-nums text-[15px] font-semibold text-[#F8F8FF]"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {formatCurrency(expense.amountMinorUnits, expense.currency)}
            </p>
          </div>
        </section>

        {/* Split breakdown */}
        <section className="mt-8 px-6">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[13px] font-medium text-[#94A3B8]">
              Split between {splitRows.length}
            </p>
            <p className="text-[12px] font-medium text-[#475569]">
              {expense.splitMethod === "equal" ? "Equal shares" : "Custom amounts"}
            </p>
          </div>

          <div>
            {splitRows.map((row, index) => (
              <div
                key={row.userId}
                className={cn(
                  "py-3.5",
                  index < splitRows.length - 1 && "border-b border-[#ffffff0f]"
                )}
              >
                <div className="flex items-center">
                  <MemberAvatar
                    userId={row.userId}
                    name={row.name}
                    size="sm"
                  />
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[15px] font-medium text-[#F8F8FF]">
                        {row.name}
                        {row.userId === expense.payerId && (
                          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[#7C3AED]">
                            Payer
                          </span>
                        )}
                      </p>
                      <p
                        className="shrink-0 tabular-nums text-[15px] font-semibold text-[#F8F8FF]"
                        style={{ fontFeatureSettings: '"tnum"' }}
                      >
                        {formatCurrency(row.amountMinorUnits, expense.currency)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#1C1C27]">
                        <div
                          className="h-full rounded-full transition-all duration-default ease-tally"
                          style={{
                            width: `${Math.max(row.share, 2)}%`,
                            backgroundColor: accent,
                          }}
                        />
                      </div>
                      <span
                        className="w-8 shrink-0 text-right text-[12px] font-medium text-[#94A3B8] tabular-nums"
                        style={{ fontFeatureSettings: '"tnum"' }}
                      >
                        {row.share}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Note */}
        {expense.note?.trim() ? (
          <section className="mt-8 px-6">
            <p className="mb-3 text-[13px] font-medium text-[#94A3B8]">Note</p>
            <p className="border-l-2 border-[#ffffff1a] pl-4 text-[15px] font-normal leading-relaxed text-[#F8F8FF]">
              {expense.note.trim()}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
