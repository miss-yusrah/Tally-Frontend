"use client";

import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import { formatCurrency } from "@/lib/currency";
import { formatFullTimestamp, formatRelativeTime, cn } from "@/lib/utils";
import { settlementDisplayName } from "@/features/settlements/settlementDisplay";
import type { Settlement, TripMember } from "@/types";
import { Check } from "lucide-react";

function MiniAvatar({
  member,
  zIndex,
  offset = false,
  size = 24,
}: {
  member: TripMember | undefined;
  zIndex: number;
  offset?: boolean;
  size?: number;
}) {
  const name = member?.displayName ?? "?";
  const bg = member ? getAvatarColorForUser(member.userId) : "#475569";
  const dim = size === 28 ? "h-7 w-7 text-[10px]" : "h-6 w-6 text-[9px]";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "border-2 border-[#0A0A0F] font-semibold text-white",
        dim,
        offset && "-ml-2"
      )}
      style={{ zIndex, backgroundColor: bg }}
    >
      {member?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getMemberInitial(name)
      )}
    </div>
  );
}

interface SettledRowProps {
  settlement: Settlement;
  payer: TripMember | undefined;
  recipient: TripMember | undefined;
  currency: string;
  currentUserId?: string;
  variant: "dashboard" | "history";
  showDivider?: boolean;
}

export function SettledRow({
  settlement,
  payer,
  recipient,
  currency,
  currentUserId,
  variant,
  showDivider = true,
}: SettledRowProps) {
  const payerLabel = settlementDisplayName(
    payer,
    settlement.fromUserId,
    currentUserId
  );
  const recipientLabel = settlementDisplayName(
    recipient,
    settlement.toUserId,
    currentUserId
  );

  const isDashboard = variant === "dashboard";
  const avatarSize = isDashboard ? 24 : 28;
  const rowHeight = isDashboard ? "min-h-[64px]" : "min-h-[76px]";

  return (
    <div
      className={cn(
        rowHeight,
        "flex items-center gap-3 py-3",
        showDivider && "border-b border-[#ffffff0f]"
      )}
    >
      <div className="flex shrink-0 items-center">
        <MiniAvatar member={payer} zIndex={1} size={avatarSize} />
        <MiniAvatar member={recipient} zIndex={2} offset size={avatarSize} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[15px] font-medium",
            isDashboard ? "text-[#94A3B8]" : "text-[#F8F8FF]"
          )}
        >
          {payerLabel} paid {recipientLabel}
        </p>
        <p
          className={cn(
            "mt-0.5 tabular-nums",
            isDashboard
              ? "text-[12px] font-normal text-[#475569]"
              : "text-[13px] font-normal text-[#94A3B8]"
          )}
        >
          {isDashboard
            ? formatRelativeTime(settlement.settledAt)
            : formatFullTimestamp(settlement.settledAt)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Check
          className="h-4 w-4 text-[#10B981]"
          strokeWidth={2.5}
          aria-hidden
        />
        <p
          className={cn(
            "tabular-nums",
            isDashboard
              ? "text-[14px] font-medium text-[#94A3B8]"
              : "text-[16px] font-semibold text-[#F8F8FF]"
          )}
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {formatCurrency(settlement.amountMinorUnits, currency)}
        </p>
      </div>
    </div>
  );
}
