"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { CurrencyPickerSheet } from "@/features/auth";
import { AmountHeroInput } from "@/features/expenses/AmountHeroInput";
import { CategoryChips } from "@/features/expenses/CategoryChips";
import {
  PayerRow,
  PayerSelectSheet,
} from "@/features/expenses/PayerSelectSheet";
import {
  SplitMethodSection,
  type SplitMode,
} from "@/features/expenses/SplitMethodSection";
import { splitEquallyMinorUnits } from "@/features/expenses/splitMath";
import { isCustomSplitExact } from "@/features/expenses/splitMath";
import {
  getCurrencyPrecision,
  getDecimalPlacesError,
  hasValidDecimalPlaces,
  parseAmountToMinorUnits,
} from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  useActiveTrip,
  useExpenseStore,
  useOpenBottomSheet,
  useTripMembers,
  useTrips,
  useUser,
} from "@/store";
import type { ExpenseCategory, ExpenseSplit } from "@/types";

interface NewExpensePageProps {
  params: { tripId: string };
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]";

export default function NewExpensePage({ params }: NewExpensePageProps) {
  const router = useRouter();
  const user = useUser();
  const activeTrip = useActiveTrip();
  const trips = useTrips();
  const members = useTripMembers();
  const addExpense = useExpenseStore((s) => s.addExpense);
  const openBottomSheet = useOpenBottomSheet();

  const trip =
    activeTrip?.id === params.tripId
      ? activeTrip
      : trips.find((t) => t.id === params.tripId) ?? null;

  // Peek scan prefill during render (idempotent); cleared in an effect below.
  const [prefill] = useState(() => useExpenseStore.getState().prefill);
  const hasScanData = Boolean(
    prefill && !prefill.failed && prefill.totalAmount && prefill.totalAmount > 0
  );

  const [currency, setCurrency] = useState(
    prefill?.currency ?? trip?.baseCurrency ?? "NGN"
  );
  // OCR-detected currency (or a manual pick) must not be overridden by
  // the trip base currency arriving later.
  const currencyLockedRef = useRef(Boolean(prefill?.currency));

  const [amountStr, setAmountStr] = useState("");
  const [payerId, setPayerId] = useState(user?.id ?? "");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [includedUserIds, setIncludedUserIds] = useState<string[]>(
    () => members.map((m) => m.userId)
  );
  const [customSplits, setCustomSplits] = useState<ExpenseSplit[]>([]);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showScanBanner, setShowScanBanner] = useState(
    Boolean(prefill?.failed)
  );
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(
    prefill?.receiptImageUrl ?? null
  );
  // Failure path shows the attached photo immediately; success path fades it
  // in at the end of the entrance sequence.
  const [thumbVisible, setThumbVisible] = useState(
    Boolean(prefill?.receiptImageUrl && !hasScanData)
  );
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (prefill) useExpenseStore.getState().clearPrefill();
  }, [prefill]);

  useEffect(() => {
    if (trip?.baseCurrency && !currencyLockedRef.current) {
      setCurrency(trip.baseCurrency);
    }
  }, [trip?.baseCurrency]);

  useEffect(() => {
    if (members.length === 0) return;
    setIncludedUserIds((prev) =>
      prev.length > 0 ? prev : members.map((m) => m.userId)
    );
    if (user?.id) setPayerId((prev) => prev || user.id);
  }, [members, user?.id]);

  // Staggered "magic moment" entrance when scan data is present (~500ms).
  useEffect(() => {
    if (!hasScanData || !prefill?.totalAmount) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    let raf = 0;

    const finalAmount = prefill.totalAmount;
    const precision = getCurrencyPrecision(prefill.currency ?? currency);

    // t=50ms — amount counts up over 300ms
    timers.push(
      setTimeout(() => {
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / 300, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setAmountStr((finalAmount * eased).toFixed(precision));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      }, 50)
    );

    // t=250ms — category chip selects via its existing selection style
    if (prefill.category) {
      const cat = prefill.category;
      timers.push(setTimeout(() => setCategory(cat), 250));
    }

    // t=400ms — merchant name typewriters into the note field (~150ms)
    if (prefill.merchantName) {
      const merchant = prefill.merchantName;
      timers.push(
        setTimeout(() => {
          const perChar = Math.max(150 / merchant.length, 10);
          let i = 0;
          const interval = setInterval(() => {
            i += 1;
            setNote(merchant.slice(0, i));
            if (i >= merchant.length) clearInterval(interval);
          }, perChar);
          intervals.push(interval);
        }, 400)
      );
    }

    // t=500ms — receipt thumbnail fades in
    timers.push(setTimeout(() => setThumbVisible(true), 500));

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalMinor = useMemo(
    () => parseAmountToMinorUnits(amountStr, currency),
    [amountStr, currency]
  );

  const decimalError = useMemo(() => {
    if (!amountStr || hasValidDecimalPlaces(amountStr, currency)) return null;
    return getDecimalPlacesError(currency);
  }, [amountStr, currency]);

  const payer = members.find((m) => m.userId === payerId) ?? members[0];

  const splitValid = useMemo(() => {
    if (totalMinor <= 0) return false;
    if (splitMode === "equal") {
      return includedUserIds.length > 0;
    }
    return isCustomSplitExact(totalMinor, customSplits);
  }, [totalMinor, splitMode, includedUserIds, customSplits]);

  const canSave =
    totalMinor > 0 &&
    Boolean(payerId) &&
    splitValid &&
    !decimalError &&
    !submitting;

  const openCurrencyPicker = useCallback(() => {
    openBottomSheet(
      <CurrencyPickerSheet
        selectedCode={currency}
        onSelect={(c) => {
          currencyLockedRef.current = true;
          setCurrency(c.code);
          if (!hasValidDecimalPlaces(amountStr, c.code)) {
            setAmountStr(amountStr.split(".")[0] ?? "");
          }
        }}
      />,
      { height: "75" }
    );
  }, [openBottomSheet, currency, amountStr]);

  const openPayerPicker = useCallback(() => {
    openBottomSheet(
      <PayerSelectSheet
        members={members}
        selectedUserId={payerId}
        onSelect={setPayerId}
      />,
      { title: "Paid by", height: "60" }
    );
  }, [openBottomSheet, members, payerId]);

  const handleSave = async () => {
    if (!canSave || !user || !trip) return;

    setSubmitting(true);

    const splitMap =
      splitMode === "equal"
        ? splitEquallyMinorUnits(totalMinor, includedUserIds)
        : customSplits;

    try {
      addExpense(
        trip.id,
        {
          amountMinorUnits: totalMinor,
          currency,
          payerId,
          splitMethod: splitMode,
          splitMap,
          category,
          note: note.trim() || undefined,
          receiptImageUrl: receiptImageUrl ?? undefined,
        },
        { baseCurrency: trip.baseCurrency, createdBy: user.id }
      );

      router.push(`/trips/${trip.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!trip) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0A0A0F] px-6">
        <p className="text-[14px] text-[#94A3B8]">Trip not found.</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0A0A0F]">
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-[#ffffff0f] bg-[#0A0A0F] safe-top">
        <Link
          href={`/trips/${trip.id}`}
          aria-label="Close"
          className={cn(
            "ml-5 flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
            "transition-colors hover:bg-[#1C1C27]",
            focusRing
          )}
        >
          <X className="h-[22px] w-[22px]" strokeWidth={2} />
        </Link>
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold text-[#F8F8FF]">
          Add expense
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-[120px]">
        {/* Scan-failed banner — pushes content down, doesn't overlay */}
        {showScanBanner && (
          <div className="flex h-11 w-full items-center gap-2 bg-[#F43F5E1a] px-6">
            <p className="flex-1 text-[13px] font-medium text-[#F43F5E]">
              Couldn&apos;t read that receipt — enter the details manually.
            </p>
            <button
              type="button"
              onClick={() => setShowScanBanner(false)}
              aria-label="Dismiss"
              className={cn("shrink-0 rounded-full p-1", focusRing)}
            >
              <X className="h-4 w-4 text-[#F43F5E]" strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="px-6 pt-4">
          <AmountHeroInput
            currency={currency}
            amountStr={amountStr}
            onAmountChange={setAmountStr}
            onCurrencyClick={openCurrencyPicker}
            decimalError={decimalError}
          />
        </div>

        <div className="mt-8 space-y-8 px-6">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#94A3B8]">
              Paid by
            </p>
            {payer && <PayerRow member={payer} onClick={openPayerPicker} />}
          </div>

          <SplitMethodSection
            members={members}
            currency={currency}
            totalMinor={totalMinor}
            mode={splitMode}
            onModeChange={setSplitMode}
            includedUserIds={includedUserIds}
            onIncludedChange={setIncludedUserIds}
            customSplits={customSplits}
            onCustomSplitsChange={setCustomSplits}
          />

          <CategoryChips selected={category} onSelect={setCategory} />

          <div className="pt-6">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className={cn(
                "h-12 w-full rounded-[12px] border border-[#ffffff0f] bg-[#13131A] px-[14px]",
                "text-[15px] font-normal text-[#F8F8FF] placeholder:text-[#475569]",
                focusRing
              )}
            />

            {receiptImageUrl && (
              <div
                className={cn(
                  "mt-3 flex items-center gap-3",
                  "transition-opacity duration-default ease-tally",
                  thumbVisible ? "opacity-100" : "opacity-0"
                )}
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label="View receipt"
                    className={cn(
                      "block h-10 w-10 overflow-hidden rounded-[8px] border border-[#ffffff0f]",
                      focusRing
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptImageUrl}
                      alt="Receipt"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImageUrl(null);
                      setThumbVisible(false);
                    }}
                    aria-label="Remove receipt"
                    className={cn(
                      "absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center",
                      "rounded-full border border-[#ffffff0f] bg-[#1C1C27]",
                      focusRing
                    )}
                  >
                    <X className="h-2.5 w-2.5 text-[#94A3B8]" strokeWidth={2.5} />
                  </button>
                </div>
                <span className="text-[12px] font-medium text-[#94A3B8]">
                  Receipt attached
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 z-20 mx-auto w-full max-w-mobile px-6 safe-bottom">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            "relative flex h-14 w-full items-center justify-center rounded-[12px]",
            "text-[16px] font-semibold transition-all duration-default ease-tally",
            focusRing,
            canSave
              ? "bg-accent-gradient text-[#F8F8FF] shadow-[0_4px_20px_#7C3AED40] active:scale-[0.98]"
              : "bg-[#1C1C27] text-[#475569]"
          )}
        >
          <span className={cn(submitting && "opacity-0")}>Save expense</span>
          {submitting && (
            <span
              className="absolute h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white"
              style={{ animationDuration: "800ms" }}
            />
          )}
        </button>
      </div>

      {/* Full-size receipt viewer */}
      {viewerOpen && receiptImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
          onClick={() => setViewerOpen(false)}
          role="dialog"
          aria-modal
          aria-label="Receipt photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receiptImageUrl}
            alt="Receipt"
            className="max-h-full max-w-full rounded-[12px]"
          />
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            aria-label="Close"
            className={cn(
              "absolute right-5 top-5 flex h-10 w-10 items-center justify-center",
              "rounded-full bg-[#1C1C27] text-[#F8F8FF]",
              focusRing
            )}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
