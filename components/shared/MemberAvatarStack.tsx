import {
  getAvatarColorForUser,
  getMemberInitial,
} from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";
import type { TripMember } from "@/types";

interface MemberAvatarStackProps {
  members?: TripMember[];
  /** 22px on balance cards, 24px on dashboard trip cards */
  size?: "sm" | "md";
  /** Show placeholder circles while members load */
  loading?: boolean;
  placeholderCount?: number;
  className?: string;
}

export function MemberAvatarStack({
  members = [],
  size = "md",
  loading = false,
  placeholderCount = 2,
  className,
}: MemberAvatarStackProps) {
  const dim = size === "sm" ? "h-[22px] w-[22px]" : "h-6 w-6";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";
  const overflowText = size === "sm" ? "text-[10px]" : "text-[11px]";

  if (loading && members.length === 0) {
    return (
      <div className={cn("flex items-center", className)} aria-hidden>
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "relative flex shrink-0 items-center justify-center rounded-full",
              "border-2 border-[#13131A] bg-[#1C1C27]",
              dim,
              textSize,
              "font-semibold text-[#475569]",
              i > 0 && "-ml-2"
            )}
            style={{ zIndex: placeholderCount - i }}
          >
            ?
          </div>
        ))}
      </div>
    );
  }

  const visible = members.slice(0, 4);
  const overflow = members.length - visible.length;

  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={`${members.length} members`}
    >
      {visible.map((member, i) => (
        <div
          key={member.userId}
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
            "border-2 border-[#13131A] font-semibold text-white",
            dim,
            textSize,
            i > 0 && "-ml-2"
          )}
          style={{
            zIndex: visible.length - i,
            backgroundColor: getAvatarColorForUser(member.userId),
          }}
          title={member.displayName}
        >
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            getMemberInitial(member.displayName)
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "relative -ml-2 flex shrink-0 items-center justify-center rounded-full",
            "border-2 border-[#13131A] bg-[#1C1C27] font-semibold text-[#94A3B8]",
            dim,
            overflowText
          )}
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
