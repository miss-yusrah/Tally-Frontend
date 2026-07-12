"use client";

import { useRef, useState } from "react";
import { Handshake } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { settlementDisplayName } from "@/features/settlements/settlementDisplay";
import { formatCurrency } from "@/lib/currency";
import { generateId } from "@/lib/utils";
import {
  useCloseBottomSheet,
  useSettlementStore,
  useAddToast,
} from "@/store";
import { cn } from "@/lib/utils";
import type { SimplifiedPayment, TripMember } from "@/types";

interface SettlementConfirmSheetProps {
  tripId: string;
  payment: SimplifiedPayment;
  payer: TripMember | undefined;
  recipient: TripMember | undefined;
  currency: string;
  currentUserId: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13131A]";

export function SettlementConfirmSheet({
  tripId,
  payment,
  payer,
  recipient,
  currency,
  currentUserId,
}: SettlementConfirmSheetProps) {
  const closeBottomSheet = useCloseBottomSheet();
  const confirmSettlement = useSettlementStore((s) => s.confirmSettlement);
  const addToast = useAddToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  /** One token per sheet session — double-tap reuses it for idempotent insert. */
  const idempotencyTokenRef = useRef(generateId());

  const isPayer = currentUserId === payment.fromUserId;
  const payerName = settlementDisplayName(payer, payment.fromUserId, currentUserId);
  const recipientName = settlementDisplayName(
    recipient,
    payment.toUserId,
    currentUserId
  );

  const handleConfirm = async () => {
    if (!isPayer || isSubmitting) return;
    setInlineError(null);
    setIsSubmitting(true);

    const ok = await confirmSettlement({
      tripId,
      payment,
      currency,
      confirmedBy: currentUserId,
      idempotencyToken: idempotencyTokenRef.current,
    });

    setIsSubmitting(false);

    if (ok) {
      closeBottomSheet();
      addToast({ message: "Marked as settled", variant: "success" });
    } else {
      setInlineError("Couldn't record this payment. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center pb-2 pt-5">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-[16px]",
          isPayer ? "bg-[#7C3AED1a]" : "bg-[#1C1C2740]"
        )}
      >
        <Handshake
          className={cn("h-7 w-7", isPayer ? "text-[#7C3AED]" : "text-[#94A3B8]")}
          strokeWidth={1.75}
        />
      </div>

      {isPayer ? (
        <>
          <p className="mt-4 text-center text-[18px] font-semibold text-[#F8F8FF]">
            You pay {recipientName}
          </p>
          <p
            className="mt-1.5 text-center text-[28px] font-bold tabular-nums text-[#F8F8FF]"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {formatCurrency(payment.amountMinorUnits, currency)}
          </p>
          <p className="mt-3 max-w-[280px] text-center text-[14px] font-normal leading-relaxed text-[#94A3B8]">
            Mark this as paid once you&apos;ve settled outside the app.
          </p>

          {inlineError ? (
            <p className="mt-4 text-center text-[13px] text-[#F43F5E]">
              {inlineError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
            className={cn(
              "mt-6 flex h-14 w-full items-center justify-center rounded-[12px]",
              "bg-accent-gradient text-[16px] font-semibold text-[#F8F8FF]",
              "shadow-[0_0_24px_#7C3AED50]",
              "transition-all duration-fast ease-tally active:scale-[0.97]",
              "disabled:opacity-70",
              focusRing
            )}
          >
            {isSubmitting ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              "Confirm payment"
            )}
          </button>

          <button
            type="button"
            onClick={closeBottomSheet}
            disabled={isSubmitting}
            className={cn(
              "mt-3 flex h-11 w-full items-center justify-center",
              "text-[15px] font-medium text-[#94A3B8]",
              "transition-colors hover:text-[#F8F8FF]",
              focusRing
            )}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-center text-[18px] font-semibold text-[#F8F8FF]">
            Waiting for {payerName} to confirm
          </p>
          <p
            className="mt-1.5 text-center text-[28px] font-bold tabular-nums text-[#94A3B8]"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {formatCurrency(payment.amountMinorUnits, currency)}
          </p>
          <p className="mt-3 max-w-[280px] text-center text-[14px] font-normal leading-relaxed text-[#475569]">
            {payerName} will mark this payment once it&apos;s been settled
            outside the app.
          </p>

          <button
            type="button"
            onClick={closeBottomSheet}
            className={cn(
              "mt-8 flex h-11 w-full items-center justify-center",
              "text-[15px] font-medium text-[#94A3B8]",
              "transition-colors hover:text-[#F8F8FF]",
              focusRing
            )}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}
