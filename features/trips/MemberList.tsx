"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sortTripMembers } from "@/lib/db/members";
import type { TripMember } from "@/types";
import { MemberRow } from "./MemberRow";

interface MemberListProps {
  members: TripMember[];
  currentUserId?: string;
}

export function MemberList({ members, currentUserId }: MemberListProps) {
  const sorted = useMemo(() => sortTripMembers(members), [members]);
  const memberIdsKey = useMemo(
    () => sorted.map((m) => m.userId).join(","),
    [sorted]
  );
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(sorted.map((m) => m.userId));

    if (!initializedRef.current) {
      knownIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    const newIds = sorted
      .filter((m) => !knownIdsRef.current.has(m.userId))
      .map((m) => m.userId);

    if (newIds.length > 0) {
      setEnteringIds(new Set(newIds));
      const timer = setTimeout(() => setEnteringIds(new Set()), 320);
      knownIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    knownIdsRef.current = currentIds;
  }, [memberIdsKey, sorted]);

  if (sorted.length === 0) {
    return (
      <p className="text-[14px] text-[#94A3B8]">
        No members yet. Share your invite link to bring the group in.
      </p>
    );
  }

  return (
    <div>
      {sorted.map((member, index) => (
        <MemberRow
          key={member.userId}
          member={member}
          isCurrentUser={member.userId === currentUserId}
          isEntering={enteringIds.has(member.userId)}
          showDivider={index < sorted.length - 1}
        />
      ))}
    </div>
  );
}
