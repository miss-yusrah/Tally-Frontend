"use client";

import { useCallback } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import { formatCurrency } from "@/lib/currency";
import { settlementDisplayName } from "@/features/settlements/settlementDisplay";
import { cn } from "@/lib/utils";
import type { TripMember } from "@/types";
import type { SimplifiedPayment } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

interface SettlementCardProps {
  payment: SimplifiedPayment;
  payer: TripMember | undefined;
  recipient: TripMember | undefined;
  currency: string;
  currentUserId?: string;
  isEntering?: boolean;
  isSettling?: boolean;
  onOpen: () => void;
}

function MiniAvatar({
  member,
  zIndex,
  offset = false,
}: {
  member: TripMember | undefined;
  zIndex: number;
  offset?: boolean;
}) {
  const name = member?.displayName ?? "?";
  const bg = member ? getAvatarColorForUser(member.userId) : "#475569";

  return (
    <div
      className={cn(
        "relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border-2 border-[#0A0A0F] text-[10px] font-semibold text-white",
        offset && "-ml-2.5"
      )}
      style={{ zIndex }}
    >
      {member?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          {getMemberInitial(name)}
        </span>
      )}
    </div>
  );
}

export function SettlementCard({
  payment,
  payer,
  recipient,
  currency,
  currentUserId,
  isEntering = false,
  isSettling = false,
  onOpen,
}: SettlementCardProps) {
  const payerLabel = settlementDisplayName(payer, payment.fromUserId, currentUserId);
  const recipientLabel = settlementDisplayName(
    recipient,
    payment.toUserId,
    currentUserId
  );

  const handleClick = useCallback(() => {
    if (!isSettling) onOpen();
  }, [isSettling, onOpen]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSettling}
      className={cn(
        "flex h-[76px] w-full items-center gap-3 rounded-[16px] border border-[#ffffff0f] bg-[#13131A] px-4 text-left",
        "transition-all duration-fast ease-tally active:scale-[0.98] active:bg-[#1C1C27]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]",
        "disabled:opacity-80",
        isEntering && "animate-settlement-row-enter"
      )}
    >
      <div className="flex shrink-0 items-center">
        <MiniAvatar member={payer} zIndex={1} />
        <MiniAvatar member={recipient} zIndex={2} offset />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[#94A3B8]">
          {isSettling ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" />
              Settling…
            </span>
          ) : (
            `${payerLabel} pays ${recipientLabel}`
          )}
        </p>
      </div>

      <p
        className="shrink-0 text-[20px] font-bold tabular-nums text-[#F8F8FF]"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {formatCurrency(payment.amountMinorUnits, currency)}
      </p>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-[#475569]"
        strokeWidth={2}
      />
    </button>
  );
}

export function SettlementsEmptyState() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-[20px]"
        style={{
          background:
            "linear-gradient(135deg, #10B98126 0%, #10B98108 100%)",
        }}
      >
        <Check className="h-10 w-10 text-[#10B981]" strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-[19px] font-bold text-[#F8F8FF]">
        Everyone&apos;s settled up
      </h3>
      <p className="mt-1.5 text-[14px] font-normal text-[#94A3B8]">
        No payments needed right now.
      </p>
    </div>
  );
}
