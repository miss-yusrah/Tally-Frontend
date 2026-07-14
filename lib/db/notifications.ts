import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils";
import type {
  Notification,
  NotificationPayload,
  NotificationType,
} from "@/types";

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  trip_id: string;
  trip_name: string;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  payload: NotificationPayload;
  read: boolean;
  created_at: string;
}

/** In-memory fallback when Supabase isn't available. */
const memoryByUser = new Map<string, Notification[]>();

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    tripId: row.trip_id,
    tripName: row.trip_name,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorAvatarUrl: row.actor_avatar_url ?? undefined,
    payload: row.payload ?? {},
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

function memoryList(userId: string): Notification[] {
  return [...(memoryByUser.get(userId) ?? [])].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function memoryUpsertMany(items: Notification[]) {
  for (const item of items) {
    const list = memoryByUser.get(item.userId) ?? [];
    memoryByUser.set(item.userId, [
      item,
      ...list.filter((n) => n.id !== item.id),
    ]);
  }
}

export function buildNotificationRecord(params: {
  userId: string;
  type: NotificationType;
  tripId: string;
  tripName: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  payload?: NotificationPayload;
  id?: string;
  createdAt?: string;
  read?: boolean;
}): Notification {
  return {
    id: params.id ?? generateId(),
    userId: params.userId,
    type: params.type,
    tripId: params.tripId,
    tripName: params.tripName,
    actorId: params.actorId,
    actorName: params.actorName,
    actorAvatarUrl: params.actorAvatarUrl,
    payload: params.payload ?? {},
    read: params.read ?? false,
    createdAt: params.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Batch-write notifications. Failures are logged by the caller —
 * never throw into the expense/join/settlement critical path.
 *
 * Dynamo key shape (optional mirror via API): NOTIFICATION#userId#createdAt#id
 * with GSI userId + createdAt desc.
 */
export async function writeNotifications(
  items: Notification[]
): Promise<void> {
  if (items.length === 0) return;

  memoryUpsertMany(items);

  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert(
    items.map((n) => ({
      id: n.id,
      user_id: n.userId,
      type: n.type,
      trip_id: n.tripId,
      trip_name: n.tripName,
      actor_id: n.actorId,
      actor_name: n.actorName,
      actor_avatar_url: n.actorAvatarUrl ?? null,
      payload: n.payload,
      read: n.read,
      created_at: n.createdAt,
    }))
  );

  if (error) {
    console.error("Failed to write notifications:", error.message, error);
    throw error;
  }
}

export async function fetchNotificationsForUser(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error.message, error);
    return memoryList(userId).slice(0, limit);
  }

  const list = (data as NotificationRow[]).map(mapRow);
  memoryByUser.set(userId, list);
  return list;
}

export async function markNotificationsRead(
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  const existing = memoryList(userId);
  const targetSet = notificationIds
    ? new Set(notificationIds)
    : null;

  memoryByUser.set(
    userId,
    existing.map((n) =>
      !targetSet || targetSet.has(n.id) ? { ...n, read: true } : n
    )
  );

  const supabase = createClient();
  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (notificationIds?.length) {
    query = query.in("id", notificationIds);
  }

  const { error } = await query;
  if (error) {
    console.error("Failed to mark notifications read:", error.message, error);
    throw error;
  }
}
