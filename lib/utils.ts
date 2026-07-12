import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Formats an ISO date (yyyy-mm-dd) as "Jun 20" without timezone drift. */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "Oct 12 – Jun 25" */
export function formatDateRange(startISO: string, endISO: string): string {
  if (!startISO) return "";
  if (!endISO || startISO === endISO) return formatShortDate(startISO);
  return `${formatShortDate(startISO)} – ${formatShortDate(endISO)}`;
}

/** Compact range for trip meta row, e.g. "Oct 12 - 18". */
export function formatCompactDateRange(startISO: string, endISO: string): string {
  if (!startISO) return "";
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  if (!endISO || startISO === endISO) {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  const [ey, em, ed] = endISO.split("-").map(Number);
  const end = new Date(ey, em - 1, ed);
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${startStr} - ${end.getDate()}`;
  }
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

/** Relative time for expense list, e.g. "2h ago", "Yesterday". */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Full timestamp for settlement history ledger, e.g. "Jun 18, 2026 · 3:42 PM". */
export function formatFullTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

/** URL-safe, ~12-char random invite token. */
export function generateInviteToken(length = 12): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += alphabet[bytes[i] % alphabet.length];
  }
  return token;
}
