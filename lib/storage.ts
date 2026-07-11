import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Upload a receipt image to the Supabase `receipts` storage bucket.
 * Returns the public URL, or null on any failure — callers must treat
 * a null result as "no attachment" and continue gracefully.
 */
export async function uploadReceiptImage(
  blob: Blob,
  tripId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const path = `${tripId}/${crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage
      .from("receipts")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });

    if (error) {
      console.error("Receipt upload failed:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("receipts").getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch (err) {
    console.error("Receipt upload failed:", err);
    return null;
  }
}
