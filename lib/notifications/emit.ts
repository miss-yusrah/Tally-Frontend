import {
  buildNotificationRecord,
  writeNotifications,
} from "@/lib/db/notifications";
import type {
  Expense,
  ExpenseCategory,
  Notification,
  Settlement,
  TripMember,
} from "@/types";

/** Fire-and-forget — never await in expense/join/settlement critical paths. */
export function emitNotifications(items: Notification[]): void {
  if (items.length === 0) return;
  void writeNotifications(items).catch((error) => {
    console.error("Notification side effect failed:", error);
  });
}

/**
 * Someone joins a trip → notify every OTHER existing member (not the joiner).
 * Organizer gets organizer-flavored copy at render time.
 * Never notify the joiner (they already know they joined).
 * Never fires for trip creation (organizer isn't "joining").
 */
export function emitMemberJoinedNotifications(params: {
  tripId: string;
  tripName: string;
  joiner: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
  /** Members after join — joiner is filtered out of recipients. */
  members: TripMember[];
}): void {
  const recipients = params.members.filter(
    (m) => m.userId !== params.joiner.userId
  );
  if (recipients.length === 0) return;

  const now = new Date().toISOString();
  emitNotifications(
    recipients.map((m) =>
      buildNotificationRecord({
        userId: m.userId,
        type: "member_joined",
        tripId: params.tripId,
        tripName: params.tripName,
        actorId: params.joiner.userId,
        actorName: params.joiner.displayName,
        actorAvatarUrl: params.joiner.avatarUrl,
        payload: {
          recipientRole: m.role === "organizer" ? "organizer" : "member",
        },
        createdAt: now,
      })
    )
  );
}

/**
 * Expense logged → notify only people in the split who owe a share,
 * never all trip members, and never the expense creator.
 */
export function emitExpenseLoggedNotifications(params: {
  expense: Expense;
  tripName: string;
  members: TripMember[];
  actor: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}): void {
  void (async () => {
    try {
      const creatorId = params.expense.createdBy;

      // Only people with a positive share — if Ada splits with Tunde only,
      // Yusrah (trip member, 0 share) must not get a notification.
      const oweUserIds = [
        ...new Set(
          (params.expense.splitMap ?? [])
            .filter((s) => s.amountMinorUnits > 0 && s.userId !== creatorId)
            .map((s) => s.userId)
        ),
      ];

      if (oweUserIds.length === 0) return;

      const category = params.expense.category as ExpenseCategory | null;
      const now = new Date().toISOString();

      await writeNotifications(
        oweUserIds.map((userId) =>
          buildNotificationRecord({
            userId,
            type: "expense_logged",
            tripId: params.expense.tripId,
            tripName: params.tripName,
            actorId: params.actor.userId,
            actorName: params.actor.displayName,
            actorAvatarUrl: params.actor.avatarUrl,
            payload: {
              amount: params.expense.amountMinorUnits,
              currency: params.expense.currency,
              category,
              note: params.expense.note,
            },
            createdAt: now,
          })
        )
      );
    } catch (error) {
      console.error("Notification side effect failed:", error);
    }
  })();
}

/**
 * Settlement confirmed → recipient (toUserId) only.
 * Never notify the payer who initiated/confirmed.
 */
export function emitSettlementConfirmedNotifications(params: {
  settlement: Settlement;
  tripName: string;
  actor: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
  };
}): void {
  const { settlement } = params;
  if (settlement.toUserId === settlement.fromUserId) return;
  // Payer is the actor — never notify them about their own confirm.
  if (settlement.toUserId === params.actor.userId) return;

  emitNotifications([
    buildNotificationRecord({
      userId: settlement.toUserId,
      type: "settlement_confirmed",
      tripId: settlement.tripId,
      tripName: params.tripName,
      actorId: params.actor.userId,
      actorName: params.actor.displayName,
      actorAvatarUrl: params.actor.avatarUrl,
      payload: {
        amount: settlement.amountMinorUnits,
        currency: settlement.currency,
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
      },
    }),
  ]);
}
