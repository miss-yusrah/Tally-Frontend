import { NextResponse } from "next/server";

const API_TIMEOUT_MS = 8000;
const VALID_CATEGORIES = [
  "food",
  "transport",
  "lodging",
  "activities",
  "other",
] as const;

const SYSTEM_PROMPT = `You extract structured data from receipt photos.
Respond with ONLY a valid JSON object — no markdown fences, no commentary — matching exactly:
{"totalAmount": number | null, "currency": string | null, "merchantName": string | null, "suggestedCategory": "food" | "transport" | "lodging" | "activities" | "other" | null, "confidence": "high" | "low"}

Rules:
- totalAmount is the grand total actually paid (after tax/tip), as a decimal number. Null if unreadable.
- currency is the ISO 4217 code inferred from symbols or text (e.g. "$" → "USD", "₦" → "NGN", "€" → "EUR"). Null if you cannot tell.
- merchantName is the business name printed on the receipt, cleaned up. Null if unreadable.
- suggestedCategory: restaurants/cafés/groceries → "food"; taxis/fuel/parking/transit → "transport"; hotels → "lodging"; tours/tickets/events → "activities"; anything else → "other". Null if unclear.
- confidence: "high" only if you clearly read a total amount from an actual receipt. Blurry, rotated, cropped, or non-receipt images → "low".`;

interface Extraction {
  totalAmount: number | null;
  currency: string | null;
  merchantName: string | null;
  suggestedCategory: string | null;
  confidence: "high" | "low";
}

function parseExtraction(text: string): Extraction | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const totalAmount =
    typeof obj.totalAmount === "number" &&
    Number.isFinite(obj.totalAmount) &&
    obj.totalAmount > 0
      ? obj.totalAmount
      : null;

  const currency =
    typeof obj.currency === "string" && /^[A-Za-z]{3}$/.test(obj.currency.trim())
      ? obj.currency.trim().toUpperCase()
      : null;

  const merchantName =
    typeof obj.merchantName === "string" && obj.merchantName.trim()
      ? obj.merchantName.trim().slice(0, 80)
      : null;

  const suggestedCategory = (VALID_CATEGORIES as readonly string[]).includes(
    String(obj.suggestedCategory)
  )
    ? String(obj.suggestedCategory)
    : null;

  const confidence: "high" | "low" =
    obj.confidence === "high" && totalAmount !== null ? "high" : "low";

  return { totalAmount, currency, merchantName, suggestedCategory, confidence };
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  let image: string | null = null;
  let mediaType = "image/jpeg";
  try {
    const body = await request.json();
    if (typeof body?.image === "string" && body.image.length > 0) {
      image = body.image;
    }
    if (typeof body?.mediaType === "string") {
      mediaType = body.mediaType;
    }
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!image) return NextResponse.json({ ok: false });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: image },
              },
              {
                type: "text",
                text: "Extract the receipt data. Respond with only the JSON object.",
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      return NextResponse.json({ ok: false });
    }

    const data = await response.json();
    const textBlock = Array.isArray(data?.content)
      ? data.content.find((b: { type: string }) => b.type === "text")
      : null;
    const extraction = parseExtraction(textBlock?.text ?? "");

    if (!extraction) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, extraction });
  } catch (err) {
    // Timeout (AbortError) and network failures both land here — same fallback.
    console.error("Receipt scan failed:", err);
    return NextResponse.json({ ok: false });
  } finally {
    clearTimeout(timeout);
  }
}
