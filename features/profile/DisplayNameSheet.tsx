"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  displayNameSchema,
  type DisplayNameFormData,
} from "@/features/auth";
import {
  useAddToast,
  useAuthStore,
  useCloseBottomSheet,
} from "@/store";
import { cn } from "@/lib/utils";

interface DisplayNameSheetProps {
  currentName: string;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13131A]";

export function DisplayNameSheet({ currentName }: DisplayNameSheetProps) {
  const closeBottomSheet = useCloseBottomSheet();
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const isUpdating = useAuthStore((s) => s.isUpdatingProfile);
  const addToast = useAddToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<DisplayNameFormData>({
    resolver: zodResolver(displayNameSchema),
    mode: "onChange",
    defaultValues: { displayName: currentName },
  });

  const onSubmit = async (data: DisplayNameFormData) => {
    const ok = await updateDisplayName(data.displayName);
    if (!ok) {
      addToast({
        message: "Couldn't update your name. Please try again.",
        variant: "error",
      });
      return;
    }
    addToast({ message: "Name updated", variant: "success" });
    closeBottomSheet();
  };

  const busy = isSubmitting || isUpdating;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="profile-display-name"
          className="text-[13px] font-medium text-[#94A3B8]"
        >
          Display name
        </label>
        <input
          id="profile-display-name"
          autoFocus
          autoComplete="nickname"
          disabled={busy}
          className={cn(
            "h-14 w-full rounded-[12px] bg-[#1C1C27] px-4",
            "text-[16px] font-medium text-[#F8F8FF] placeholder:text-[#475569]",
            "border border-[#ffffff0f]",
            "transition-colors duration-fast ease-tally",
            errors.displayName
              ? "border-[#F43F5E50]"
              : "focus:border-[#7C3AED]",
            focusRing
          )}
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="text-[12px] text-[#F43F5E]">
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!isValid || busy}
        className={cn(
          "relative flex h-14 w-full items-center justify-center overflow-hidden rounded-[12px]",
          "text-[16px] font-semibold transition-all duration-fast ease-tally",
          "active:scale-[0.98]",
          isValid && !busy
            ? "bg-accent-gradient text-[#F8F8FF] shadow-[0_4px_20px_#7C3AED40]"
            : "bg-[#1C1C27] text-[#475569]",
          focusRing
        )}
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
