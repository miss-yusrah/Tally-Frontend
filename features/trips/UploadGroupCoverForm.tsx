"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Upload } from "lucide-react";
import {
  AuthBackButton,
  AuthBody,
  AuthPrimaryButton,
  AuthStackHeader,
  AuthStackScreen,
  useAuthSession,
} from "@/features/auth";
import {
  useAddToast,
  useCreateGroupDraftStore,
  useTripStore,
} from "@/store";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Figma preset covers the user can pick instead of uploading their own. */
const PRESET_COVERS = [
  { id: "preset-1", src: "/tabr/home/images/card images/card image 1.webp" },
  { id: "preset-2", src: "/tabr/home/images/card images/card image 2.webp" },
  { id: "preset-3", src: "/tabr/home/images/card images/card image 3.webp" },
  { id: "preset-4", src: "/tabr/home/images/card images/card image 4.webp" },
] as const;

/**
 * Step 2 of create-group: pick a cover photo — either from the device gallery
 * or one of the preset Figma images — then finalize Create.
 */
export function UploadGroupCoverForm() {
  const router = useRouter();
  const { user } = useAuthSession();
  const createTrip = useTripStore((s) => s.createTrip);
  const draft = useCreateGroupDraftStore((s) => s.draft);
  const hydrateDraft = useCreateGroupDraftStore((s) => s.hydrateDraft);
  const clearDraft = useCreateGroupDraftStore((s) => s.clearDraft);
  const addToast = useAddToast();

  const inputRef = useRef<HTMLInputElement>(null);
  /** Preview URL: blob: for gallery pick, /tabr/... for preset, or data URL. */
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  /** Gallery file kept so we can persist a durable data URL (blob: dies on refresh). */
  const selectedFileRef = useRef<File | null>(null);
  /** Whether the current selection is a blob (needs revoke on cleanup). */
  const selectedIsBlob = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });


  useEffect(() => {
    const existing = hydrateDraft();
    if (!existing) {
      router.replace("/trips/new");
      return;
    }
    setReady(true);
  }, [hydrateDraft, router]);

  useEffect(() => {
    return () => {
      if (selectedIsBlob.current && selectedUrl) {
        URL.revokeObjectURL(selectedUrl);
      }
    };
  }, [selectedUrl]);

  const openGallery = () => inputRef.current?.click();

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      addToast({
        message: "Please choose an image file.",
        variant: "error",
        duration: 2500,
      });
      return;
    }

    if (selectedIsBlob.current && selectedUrl) URL.revokeObjectURL(selectedUrl);
    selectedIsBlob.current = true;
    selectedFileRef.current = file;
    setSelectedUrl(URL.createObjectURL(file));
  };

  const selectPreset = (src: string) => {
    if (selectedIsBlob.current && selectedUrl) URL.revokeObjectURL(selectedUrl);
    selectedIsBlob.current = false;
    selectedFileRef.current = null;
    setSelectedUrl(src);
  };

  const onCreate = async () => {
    if (!user) {
      addToast({ message: "You need to be signed in.", variant: "error" });
      return;
    }
    const activeDraft = draft ?? hydrateDraft();
    if (!activeDraft) {
      router.replace("/trips/new");
      return;
    }

    setSubmitting(true);
    try {
      let coverImageUrl = selectedUrl ?? undefined;
      if (selectedFileRef.current) {
        coverImageUrl = await fileToDataUrl(selectedFileRef.current);
      }

      const trip = await createTrip(
        {
          name: activeDraft.name,
          destination: "",
          startDate: "",
          endDate: "",
          baseCurrency: activeDraft.baseCurrency,
          coverImageUrl,
        },
        user
      );
      clearDraft();
      router.push(`/dashboard?created=${trip.id}`);
    } catch {
      setSubmitting(false);
      addToast({
        message: "Couldn't create the group. Please try again.",
        variant: "error",
      });
    }
  };

  if (!ready) {
    return (
      <AuthStackScreen>
        <div className="flex flex-1 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#5921B5]/30 border-t-[#5921B5]" />
        </div>
      </AuthStackScreen>
    );
  }

  return (
    <AuthStackScreen>
      <AuthBackButton href="/trips/new" label="Back to group details" />

      <AuthStackHeader
        title="Upload image"
        subtitle="Share a fun image of your crew"
      />

      <AuthBody className="flex-1 overflow-y-auto">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />

        {/* ── Main preview / upload tap target ─────────────────────────── */}
        <button
          type="button"
          onClick={openGallery}
          className={cn(
            "relative mt-2 flex w-full overflow-hidden rounded-[24px]",
            "aspect-[358/220] items-center justify-center",
            selectedUrl ? "bg-[#15131A]" : "bg-[#F5F5F7]",
            "transition-opacity active:opacity-95",
            focusRing
          )}
          aria-label={
            selectedUrl ? "Change group cover image" : "Choose group cover image from gallery"
          }
        >
          {selectedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          <span
            className={cn(
              "relative z-10 flex h-10 w-10 items-center justify-center rounded-xl",
              selectedUrl
                ? "bg-black/35 text-white backdrop-blur-[2px]"
                : "text-[#AEAEB2]"
            )}
            aria-hidden
          >
            <ImageIcon className="h-7 w-7" strokeWidth={1.5} />
          </span>
        </button>

        {/* ── Preset picker ─────────────────────────────────────────────── */}
        <div className="mt-6">
          <p className="text-[13px] font-medium text-[#15131A]">
            Or choose a preset
          </p>
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {PRESET_COVERS.map((preset) => {
              const active = selectedUrl === preset.src;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    onClick={() => selectPreset(preset.src)}
                    className={cn(
                      "relative w-full overflow-hidden rounded-[14px]",
                      "aspect-square",
                      "transition-transform active:scale-95",
                      active
                        ? "ring-2 ring-[#5921B5] ring-offset-2"
                        : "ring-0",
                      focusRing
                    )}
                    aria-pressed={active}
                    aria-label={`Preset cover ${preset.id.split("-")[1]}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Upload-from-gallery shortcut below the presets */}
          <button
            type="button"
            onClick={openGallery}
            className={cn(
              "mt-3 flex w-full items-center gap-2 rounded-2xl border border-dashed border-[#D4D4D8]",
              "bg-[#FAFAFA] px-4 py-3 text-left",
              "hover:bg-[#F4F4F5] transition-colors",
              focusRing
            )}
          >
            <Upload className="h-4 w-4 shrink-0 text-[#5921B5]" strokeWidth={2} />
            <span className="text-[13px] font-medium text-[#15131A]">
              Upload from your gallery
            </span>
          </button>
        </div>

        <div className="mt-auto pt-8">
          <AuthPrimaryButton
            type="button"
            variant="stack"
            enabled={!submitting}
            disabled={submitting}
            onClick={() => void onCreate()}
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Create"
            )}
          </AuthPrimaryButton>
        </div>
      </AuthBody>
    </AuthStackScreen>
  );
}
