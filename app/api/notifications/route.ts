import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Notification, NotificationType } from "@/types";

/**
 * GET /api/notifications — list feed for the signed-in user (newest first).
 * PATCH /api/notifications — { ids?: string[] } mark read (omit ids = all).
 */

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  trip_id: string;
  trip_name: string;
  actor_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  payload: Notification["payload"];
  read: boolean;
  created_at: string;
}

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

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, reason: "fetch_failed" },
      { status: 500 }
    );
  }

  const notifications = ((data ?? []) as NotificationRow[]).map(mapRow);
  return NextResponse.json({
    ok: true,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  });
}

const patchSchema = z
  .object({
    ids: z.array(z.string().uuid()).optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "validation_error" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (parsed.data.ids?.length) {
    query = query.in("id", parsed.data.ids);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, reason: "update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
