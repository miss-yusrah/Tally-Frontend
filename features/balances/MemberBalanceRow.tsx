import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Balance } from "@/types";

interface MemberBalanceRowProps {
  balance: Balance;
  currency: string;
  isCurrentUser?: boolean;
  showDivider?: boolean;
}

export function MemberBalanceRow({
  balance,
  currency,
  isCurrentUser = false,
  showDivider = true,
}: MemberBalanceRowProps) {
  const { netMinorUnits } = balance;
  const bgColor = getAvatarColorForUser(balance.userId);
  const initial = getMemberInitial(balance.displayName);

  let positionLabel: React.ReactNode;
  if (netMinorUnits === 0) {
    positionLabel = (
      <span className="text-[15px] font-semibold text-[#94A3B8]">Settled</span>
    );
  } else if (netMinorUnits > 0) {
    positionLabel = (
      <span className="text-[15px] font-semibold tabular-nums text-[#10B981]">
        +{formatCurrency(netMinorUnits, currency)}
      </span>
    );
  } else {
    positionLabel = (
      <span className="text-[15px] font-semibold tabular-nums text-[#F43F5E]">
        -{formatCurrency(Math.abs(netMinorUnits), currency)}
      </span>
    );
  }

  return (
    <div className={cn(showDivider && "border-b border-[#ffffff0f]")}>
      <div className="flex h-16 items-center">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-[#F8F8FF]"
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
        <span className="ml-3 min-w-0 flex-1 truncate text-[16px] font-medium text-[#F8F8FF]">
          {isCurrentUser ? "You" : balance.displayName}
        </span>
        <div className="shrink-0">{positionLabel}</div>
      </div>
    </div>
  );
}
