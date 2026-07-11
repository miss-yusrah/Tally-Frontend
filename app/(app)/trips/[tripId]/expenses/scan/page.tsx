"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/features/expenses/categoryConfig";
import { uploadReceiptImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useExpenseStore } from "@/store";
import type { ExpenseCategory } from "@/types";

interface ScanPageProps {
  params: { tripId: string };
}

type Phase = "camera" | "fallback" | "processing";

const STATUS_PHRASES = [
  "Finding the total",
  "Checking the merchant",
  "Almost there",
];

const MAX_EDGE_PX = 1600;
const MAX_BYTES = 1.5 * 1024 * 1024;
const MIN_PROCESSING_MS = 900;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Resize (longest edge ≤ 1600px) and re-encode as JPEG under ~1.5MB. */
async function normalizeToJpeg(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (quality: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
        "image/jpeg",
        quality
      )
    );

  let blob = await encode(0.8);
  if (blob.size > MAX_BYTES) blob = await encode(0.6);
  return blob;
}

interface ScanExtraction {
  totalAmount: number;
  currency: string | null;
  merchantName: string | null;
  category: ExpenseCategory | null;
}

async function callScanApi(base64: string): Promise<ScanExtraction | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("/api/expenses/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.ok || !json.extraction) return null;

    const ex = json.extraction;
    const amountOk =
      typeof ex.totalAmount === "number" &&
      Number.isFinite(ex.totalAmount) &&
      ex.totalAmount > 0;

    // "Model returned nothing useful" and "API failed" take the same path.
    if (!amountOk || ex.confidence !== "high") return null;

    const category = EXPENSE_CATEGORIES.some((c) => c.id === ex.suggestedCategory)
      ? (ex.suggestedCategory as ExpenseCategory)
      : null;
    const currency =
      typeof ex.currency === "string" && /^[A-Z]{3}$/.test(ex.currency)
        ? ex.currency
        : null;
    const merchantName =
      typeof ex.merchantName === "string" && ex.merchantName.trim()
        ? ex.merchantName.trim()
        : null;

    return { totalAmount: ex.totalAmount, currency, merchantName, category };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default function ScanReceiptPage({ params }: ScanPageProps) {
  const { tripId } = params;
  const router = useRouter();
  const setPrefillData = useExpenseStore((s) => s.setPrefillData);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("camera");
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [shutterPressed, setShutterPressed] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Camera opens immediately on mount; denied/unavailable → upload fallback.
  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("fallback");
      return;
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setPhase("fallback");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Rotating status phrases while processing.
  useEffect(() => {
    if (phase !== "processing") return;
    const interval = setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_PHRASES.length),
      1400
    );
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (backdropUrl) URL.revokeObjectURL(backdropUrl);
    };
  }, [backdropUrl]);

  const processImage = useCallback(
    async (blob: Blob) => {
      if (processingRef.current) return;
      processingRef.current = true;

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      setBackdropUrl(URL.createObjectURL(blob));
      setPhase("processing");

      const startedAt = Date.now();

      // Upload and OCR run in parallel; both failures are non-fatal.
      const uploadPromise = uploadReceiptImage(blob, tripId).catch(() => null);
      let extraction: ScanExtraction | null = null;
      try {
        const base64 = await blobToBase64(blob);
        extraction = await callScanApi(base64);
      } catch {
        extraction = null;
      }

      const receiptImageUrl = (await uploadPromise) ?? null;

      // Keep the processing state visible long enough to read.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PROCESSING_MS) {
        await new Promise((r) => setTimeout(r, MIN_PROCESSING_MS - elapsed));
      }

      setPrefillData({
        totalAmount: extraction?.totalAmount ?? null,
        currency: extraction?.currency ?? null,
        category: extraction?.category ?? null,
        merchantName: extraction?.merchantName ?? null,
        receiptImageUrl,
        failed: extraction === null,
      });

      setExiting(true);
      await new Promise((r) => setTimeout(r, 250));
      router.replace(`/trips/${tripId}/expenses/new`);
    },
    [tripId, router, setPrefillData]
  );

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || processingRef.current) return;

    setShutterPressed(true);
    setTimeout(() => setShutterPressed(false), 150);

    const scale = Math.min(
      1,
      MAX_EDGE_PX / Math.max(video.videoWidth, video.videoHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const encode = (quality: number) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );

    let blob = await encode(0.8);
    if (blob && blob.size > MAX_BYTES) blob = await encode(0.6);
    if (blob) void processImage(blob);
  }, [processImage]);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || processingRef.current) return;
      void (async () => {
        const blob = await normalizeToJpeg(file).catch(() => file);
        void processImage(blob);
      })();
    },
    [processImage]
  );

  return (
    <div
      className={cn(
        "relative min-h-dvh overflow-hidden bg-[#0A0A0F]",
        exiting && "animate-slide-out-left"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {phase === "processing" ? (
        /* STATE B — processing overlay on blurred capture */
        <div className="absolute inset-0">
          {backdropUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={backdropUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover"
              style={{ filter: "blur(20px) brightness(0.4)" }}
            />
          )}

          <div className="relative flex min-h-dvh flex-col items-center justify-center px-6">
            <div className="relative h-[88px] w-[88px] overflow-hidden rounded-[20px] border border-[#ffffff0f] bg-[#13131A]">
              <div
                className="animate-scan-sweep absolute left-2 right-2 top-2 h-[2px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, #7C3AED 0%, #2563EB 100%)",
                }}
              />
            </div>

            <p className="mt-5 text-[17px] font-semibold text-[#F8F8FF]">
              Reading your receipt...
            </p>
            <p
              key={statusIdx}
              className="animate-fade-swap mt-1.5 text-[14px] font-normal text-[#94A3B8]"
            >
              {STATUS_PHRASES[statusIdx]}
            </p>
          </div>
        </div>
      ) : phase === "fallback" ? (
        /* Camera unavailable — upload drop-zone */
        <div className="flex min-h-dvh flex-col">
          <div className="flex h-16 items-center safe-top">
            <button
              type="button"
              onClick={() => router.push(`/trips/${tripId}`)}
              aria-label="Close"
              className={cn(
                "ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[#F8F8FF]",
                "transition-colors hover:bg-[#1C1C27]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
              )}
            >
              <X className="h-[22px] w-[22px]" strokeWidth={2} />
            </button>
            <h1 className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold text-[#F8F8FF]">
              Add Expense
            </h1>
          </div>

          <div className="flex flex-1 items-center justify-center px-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-[280px] w-[280px] flex-col items-center justify-center gap-4",
                "rounded-[20px] border-2 border-dashed border-[#ffffff1a]",
                "transition-colors duration-fast ease-tally active:bg-[#13131A]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
              )}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1C1C27]">
                <UploadCloud className="h-10 w-10 text-[#94A3B8]" strokeWidth={1.75} />
              </span>
              <span className="text-[15px] font-medium text-[#94A3B8]">
                Tap to upload a photo
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE A — live camera */
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Top gradient + close */}
          <div
            className="absolute inset-x-0 top-0 h-[100px] safe-top"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,10,15,0.8) 0%, transparent 100%)",
            }}
          >
            <button
              type="button"
              onClick={() => router.push(`/trips/${tripId}`)}
              aria-label="Close camera"
              className={cn(
                "ml-5 mt-5 flex h-10 w-10 items-center justify-center rounded-full",
                "text-white transition-colors hover:bg-white/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
              )}
            >
              <X className="h-[22px] w-[22px]" strokeWidth={2} />
            </button>
          </div>

          {/* Viewfinder guide */}
          <div
            className="pointer-events-none absolute inset-8 rounded-[16px] border-2 border-white/40"
            aria-hidden
          />

          {/* Bottom gradient + controls */}
          <div
            className="absolute inset-x-0 bottom-0 flex h-[160px] items-center justify-center safe-bottom"
            style={{
              background:
                "linear-gradient(0deg, rgba(10,10,15,0.8) 0%, transparent 100%)",
            }}
          >
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload from gallery"
                className={cn(
                  "absolute -left-[68px] flex h-11 w-11 items-center justify-center text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded-full"
                )}
              >
                <ImageIcon className="h-[22px] w-[22px]" strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={capture}
                aria-label="Capture receipt"
                className={cn(
                  "flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                )}
              >
                <span
                  className={cn(
                    "block h-14 w-14 rounded-full bg-white",
                    "transition-transform duration-fast ease-tally",
                    shutterPressed ? "scale-[0.85]" : "scale-100"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
