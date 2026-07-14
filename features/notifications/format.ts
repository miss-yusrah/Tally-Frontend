import { formatCurrency } from "@/lib/currency";
import { getCategoryConfig } from "@/features/expenses/categoryConfig";
import type {
  ExpenseLoggedPayload,
  MemberJoinedPayload,
  Notification,
  SettlementConfirmedPayload,
} from "@/types";

/** Local-calendar day key using the user's timezone (not UTC). */
export function localDayKey(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const fmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  void now;
  return fmt.format(date);
}

export function isLocalToday(iso: string, now = new Date()): boolean {
  return localDayKey(iso) === localDayKey(now.toISOString());
}

export function formatNotificationTime(
  iso: string,
  now = new Date()
): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24 && isLocalToday(iso, now)) return `${diffHr}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (localDayKey(iso) === localDayKey(yesterday.toISOString())) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatNotificationMessage(n: Notification): string {
  switch (n.type) {
    case "member_joined": {
      const payload = n.payload as MemberJoinedPayload;
      if (payload.recipientRole === "organizer") {
        return `${n.actorName} joined your trip`;
      }
      return `${n.actorName} joined the trip via invite link`;
    }
    case "expense_logged": {
      const payload = n.payload as ExpenseLoggedPayload;
      const amount = formatCurrency(payload.amount, payload.currency);
      const detail =
        payload.note?.trim() ||
        getCategoryConfig(payload.category)?.label ||
        null;
      return detail
        ? `${n.actorName} logged a ${amount} expense for ${detail}`
        : `${n.actorName} logged a ${amount} expense in ${n.tripName}`;
    }
    case "settlement_confirmed": {
      const payload = n.payload as SettlementConfirmedPayload;
      const amount = formatCurrency(payload.amount, payload.currency);
      return `${n.actorName} confirmed your ${amount} settlement`;
    }
    default:
      return "New activity";
  }
}

export function notificationHref(n: Notification): string {
  switch (n.type) {
    case "settlement_confirmed":
      return `/trips/${n.tripId}/balances`;
    case "expense_logged":
      return `/trips/${n.tripId}#expenses`;
    case "member_joined":
    default:
      return `/trips/${n.tripId}`;
  }
}
