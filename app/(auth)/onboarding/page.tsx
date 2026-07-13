"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown } from "lucide-react";
import {
  onboardingSchema,
  type OnboardingFormData,
  useAuthSession,
  CurrencyPickerSheet,
} from "@/features/auth";
import { createClient } from "@/lib/supabase/client";
import { getCurrencyByCode } from "@/lib/currency";
import { useAuthStore, useOpenBottomSheet, useTripStore, useAddToast } from "@/store";
import { cn } from "@/lib/utils";

type SubmitPhase = "idle" | "submitting" | "success";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const openBottomSheet = useOpenBottomSheet();
  const addToast = useAddToast();
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      displayName: user?.displayName ?? "",
      homeCurrency: "",
    },
  });

  const homeCurrency = watch("homeCurrency");
  const selectedCurrency = homeCurrency
    ? getCurrencyByCode(homeCurrency)
    : undefined;

  const openCurrencyPicker = () => {
    openBottomSheet(
      <CurrencyPickerSheet
        selectedCode={homeCurrency}
        onSelect={(c) =>
          setValue("homeCurrency", c.code, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      />,
      { height: "75" }
    );
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setPhase("submitting");
    setServerError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: data.displayName,
          home_currency: data.homeCurrency,
          onboarding_complete: true,
        },
      });
      if (error) throw error;

      completeOnboarding(data.displayName, data.homeCurrency);
      setPhase("success");

      await new Promise((r) => setTimeout(r, 450));
      setExiting(true);
      await new Promise((r) => setTimeout(r, 250));
      router.refresh();

      const authUser = useAuthStore.getState().user;
      const pendingToken = useTripStore.getState().pendingInviteToken;

      if (authUser?.onboardingComplete && pendingToken) {
        try {
          const result = await useTripStore
            .getState()
            .joinTripViaToken(pendingToken, authUser);
          useTripStore.getState().clearPendingInvite();

          if (result.ok) {
            if (result.isNewMember) {
              addToast({
                message: `You joined ${result.trip.name}`,
                variant: "success",
              });
              router.replace(`/trips/${result.trip.id}`);
            }
            return;
          }

          addToast({
            message:
              "This invite link isn't valid. Ask your trip organizer for a new one.",
            variant: "error",
          });
        } catch {
          useTripStore.getState().clearPendingInvite();
          addToast({
            message: "Couldn't join the trip. Please try again.",
            variant: "error",
          });
        }
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setPhase("idle");
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong. Please try again.";
      setServerError(message);
    }
  };

  const ctaEnabled = isValid && phase === "idle";

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-[#0A0A0F]",
        exiting && "animate-slide-out-left"
      )}
    >
      {/* Progress bar — 4px, full width, single step, pinned y:0 */}
      <div className="h-1 w-full bg-[#1C1C27]">
        <div className="h-full w-full bg-accent-gradient" />
      </div>

      <div className="flex flex-1 flex-col px-6 pb-[120px] safe-top">
        {/* Headline zone (y:80–180) */}
        <div className="pt-[72px]">
          <h1 className="max-w-[320px] text-[26px] font-bold leading-[1.2] text-[#F8F8FF]">
            What should we call you?
          </h1>
          <p className="mt-2 text-[15px] font-normal text-[#94A3B8]">
            Takes 10 seconds.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-10 flex flex-col gap-6"
        >
          {/* Display name */}
          <div>
            <label
              htmlFor="displayName"
              className="mb-1 block text-[13px] font-medium text-[#94A3B8]"
            >
              Display name
            </label>
            <input
              id="displayName"
              {...register("displayName")}
              autoComplete="name"
              autoFocus
              placeholder="e.g. Yusrah"
              className={cn(
                "h-14 w-full rounded-[12px] bg-[#13131A] px-4",
                "text-[18px] font-medium text-[#F8F8FF] placeholder:text-[#475569]",
                "border transition-all duration-default ease-tally",
                "focus:border-[#7C3AED] focus:border-[1.5px] focus:outline-none",
                "focus:shadow-[0_0_0_4px_#7C3AED1a]",
                "focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
                errors.displayName
                  ? "border-[#F43F5E]"
                  : "border-[#ffffff0f]"
              )}
            />
            {errors.displayName && (
              <p className="mt-1.5 text-[13px] text-[#F43F5E]">
                {errors.displayName.message}
              </p>
            )}
          </div>

          {/* Home currency */}
          <div>
            <label
              htmlFor="homeCurrency"
              className="mb-1 block text-[13px] font-medium text-[#94A3B8]"
            >
              Home currency
            </label>
            <Controller
              name="homeCurrency"
              control={control}
              render={() => (
                <button
                  type="button"
                  id="homeCurrency"
                  onClick={openCurrencyPicker}
                  className={cn(
                    "flex h-14 w-full items-center justify-between rounded-[12px] bg-[#13131A] px-4",
                    "border transition-all duration-default ease-tally",
                    "focus:border-[#7C3AED] focus:border-[1.5px] focus:outline-none",
                    "focus:shadow-[0_0_0_4px_#7C3AED1a]",
                    "focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
                    errors.homeCurrency
                      ? "border-[#F43F5E]"
                      : "border-[#ffffff0f]"
                  )}
                >
                  {selectedCurrency ? (
                    <span className="text-[16px] font-semibold text-[#F8F8FF]">
                      {selectedCurrency.flag} {selectedCurrency.code}
                    </span>
                  ) : (
                    <span className="text-[18px] font-medium text-[#475569]">
                      Select currency
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                </button>
              )}
            />
            <p className="mt-2 max-w-[340px] text-[13px] leading-[1.4] text-[#475569]">
              This is your personal default — each trip can still use its own
              currency.
            </p>
            {errors.homeCurrency && (
              <p className="mt-1.5 text-[13px] text-[#F43F5E]">
                {errors.homeCurrency.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-[13px] text-[#F43F5E]">{serverError}</p>
          )}
        </form>
      </div>

      {/* Pinned CTA — full width inside padded container, not edge-to-edge */}
      <div className="fixed bottom-6 left-0 right-0 z-20 mx-auto w-full max-w-mobile px-6 safe-bottom">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={!ctaEnabled && phase !== "success"}
          className={cn(
            "relative flex h-14 w-full items-center justify-center overflow-hidden rounded-[12px]",
            "text-[16px] font-semibold transition-all duration-default ease-tally",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
            ctaEnabled || phase === "submitting" || phase === "success"
              ? "bg-accent-gradient text-[#F8F8FF] shadow-[0_4px_20px_#7C3AED40]"
              : "bg-[#1C1C27] text-[#475569] shadow-none",
            phase === "submitting" && "opacity-90"
          )}
        >
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-fast ease-tally",
              phase === "idle" ? "scale-100 opacity-100" : "scale-90 opacity-0",
              !ctaEnabled && "text-[#475569]"
            )}
          >
            Continue
          </span>

          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-fast ease-tally",
              phase === "submitting" ? "opacity-100" : "opacity-0"
            )}
          >
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </span>

          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-fast ease-tally",
              phase === "success"
                ? "scale-100 opacity-100"
                : "scale-90 opacity-0"
            )}
          >
            <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
        </button>
      </div>
    </div>
  );
}
