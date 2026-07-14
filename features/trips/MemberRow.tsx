import { cn } from "@/lib/utils";
import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import type { TripMember } from "@/types";

interface MemberRowProps {
  member: TripMember;
  isEntering?: boolean;
  showDivider?: boolean;
  isCurrentUser?: boolean;
}

export function MemberRow({
  member,
  isEntering = false,
  showDivider = true,
  isCurrentUser = false,
}: MemberRowProps) {
  const bgColor = getAvatarColorForUser(member.userId);
  const initial = getMemberInitial(member.displayName);
  const label = isCurrentUser
    ? `${member.displayName} (You)`
    : member.displayName;

  return (
    <div
      className={cn(
        isEntering && "animate-member-row-enter",
        showDivider && "border-b border-[#ffffff1a]"
      )}
    >
      <div className="flex min-h-[68px] items-center py-1">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.avatarUrl}
            alt={member.displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-[#F8F8FF]"
            style={{ backgroundColor: bgColor }}
            aria-hidden
          >
            {initial}
          </div>
        )}

        <div className="ml-3 flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-[16px] font-medium text-[#F8F8FF]">
            {label}
          </span>
          {member.role === "organizer" && (
            <span
              className={cn(
                "shrink-0 rounded-full border border-[#7C3AED60] bg-[#7C3AED26]",
                "px-2 py-[3px] text-[11px] font-bold text-[#7C3AED]"
              )}
            >
              Organizer
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
