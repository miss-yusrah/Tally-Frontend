import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidCurrencyCode } from "@/lib/currency";
import { updateUser } from "@/lib/db/users";
import { createClient } from "@/lib/supabase/server";

const patchUserSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Enter a display name with at least 2 characters")
      .max(50, "Display name can't be longer than 50 characters")
      .optional(),
    homeCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .refine(isValidCurrencyCode, "Select a valid currency code")
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.displayName !== undefined || data.homeCurrency !== undefined,
    { message: "Provide displayName and/or homeCurrency" }
  );

/**
 * PATCH /api/user — { displayName?, homeCurrency? }
 *
 * Updates the signed-in user's profile. Primary persistence is Supabase
 * user_metadata (source of truth for authStore). Also best-effort PATCHes
 * the USER# DynamoDB row when Dynamo is configured.
 */
export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        reason: "validation_error",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { displayName, homeCurrency } = parsed.data;

  const metadata: Record<string, string> = {};
  if (displayName !== undefined) metadata.display_name = displayName;
  if (homeCurrency !== undefined) metadata.home_currency = homeCurrency;

  const { data: updatedAuth, error: authError } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (authError || !updatedAuth.user) {
    console.error("Failed to update Supabase user metadata:", authError);
    return NextResponse.json(
      { ok: false, reason: "update_failed" },
      { status: 500 }
    );
  }

  // Best-effort Dynamo USER# sync — session id may not exist in Dynamo
  // if the account was created only via Supabase auth.
  try {
    await updateUser(user.id, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(homeCurrency !== undefined ? { homeCurrency } : {}),
    });
  } catch (error) {
    console.warn("Dynamo user patch skipped or failed:", error);
  }

  const meta = (updatedAuth.user.user_metadata ?? {}) as {
    display_name?: string;
    home_currency?: string;
    avatar_url?: string;
    onboarding_complete?: boolean;
  };

  return NextResponse.json({
    ok: true,
    user: {
      id: updatedAuth.user.id,
      email: updatedAuth.user.email ?? "",
      displayName: meta.display_name ?? "",
      homeCurrency: meta.home_currency ?? "USD",
      avatarUrl: meta.avatar_url,
      onboardingComplete: meta.onboarding_complete === true,
    },
  });
}
