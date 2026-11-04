"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Check, ChevronDown } from "lucide-react";
import {
  AuthBody,
  AuthField,
  AuthHeader,
  AuthInput,
  AuthLogo,
  AuthPrimaryButton,
  AuthScreen,
  type OnboardingFormData,
} from "@/features/auth";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";
import { authFieldBorder, authFieldClassRounded } from "@/features/auth/authFormStyles";
import { OnboardingCurrencyPicker } from "@/features/onboarding";
import { getCurrencyByCode } from "@/lib/currency";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type SubmitPhase = "idle" | "submitting" | "success";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyFieldRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<OnboardingFormData>({
    resolver: lazyZodResolver<OnboardingFormData>(
      () => import("@/features/auth/schemas").then((m) => m.onboardingSchema)
    ),
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

  const onSubmit = async (data: OnboardingFormData) => {
    setPhase("submitting");
    await new Promise((r) => setTimeout(r, 400));
    completeOnboarding(data.displayName, data.homeCurrency);
    setPhase("success");
    await new Promise((r) => setTimeout(r, 350));
    router.push("/dashboard");
  };

  const ctaEnabled = isValid && phase === "idle";

  return (
    <AuthScreen>
      <AuthLogo />
      <AuthHeader
        title="What should we call you?"
        subtitle="Share what your friends call you"
      />

      <AuthBody className="flex-1">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full min-w-0 flex-1 flex-col"
        >
          <div className="flex w-full min-w-0 flex-col gap-6">
            <AuthField
              label="Username"
              htmlFor="displayName"
              error={errors.displayName?.message}
            >
              <AuthInput
                id="displayName"
                autoComplete="nickname"
                autoFocus
                placeholder="Display name"
                variant="rounded"
                error={!!errors.displayName}
                {...register("displayName")}
              />
            </AuthField>

            <div ref={currencyFieldRef} className="relative w-full min-w-0">
              <AuthField
                label="Your home currency"
                htmlFor="homeCurrency"
                error={errors.homeCurrency?.message}
              >
                <Controller
                  name="homeCurrency"
                  control={control}
                  render={() => (
                    <>
                      <button
                        type="button"
                        id="homeCurrency"
                        aria-haspopup="listbox"
                        aria-expanded={currencyOpen}
                        onClick={() => setCurrencyOpen((open) => !open)}
                        className={cn(
                          authFieldClassRounded,
                          "flex items-center justify-between text-left",
                          currencyOpen
                            ? "rounded-b-none border-b-0"
                            : "rounded-2xl",
                          authFieldBorder(!!errors.homeCurrency)
                        )}
                      >
                        <span className="flex items-center gap-3 text-base text-[#0A0A0A]">
                          {selectedCurrency ? (
                            <>
                              <span className="text-xl leading-none" aria-hidden>
                                {selectedCurrency.flag}
                              </span>
                              <span>{selectedCurrency.code}</span>
                            </>
                          ) : (
                            "Select currency"
                          )}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 text-[#8E8E93] transition-transform",
                            currencyOpen && "rotate-180"
                          )}
                          strokeWidth={1.75}
                        />
                      </button>

                      {currencyOpen && (
                        <OnboardingCurrencyPicker
                          selectedCode={homeCurrency}
                          containerRef={currencyFieldRef}
                          onSelect={(currency) =>
                            setValue("homeCurrency", currency.code, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          onClose={() => setCurrencyOpen(false)}
                        />
                      )}
                    </>
                  )}
                />
              </AuthField>
            </div>
          </div>

          <div className="mt-auto pt-16">
            <AuthPrimaryButton
              enabled={ctaEnabled || phase === "submitting" || phase === "success"}
              disabled={!ctaEnabled && phase !== "success"}
              className="relative overflow-hidden"
            >
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-all",
                  phase === "idle" ? "scale-100 opacity-100" : "scale-90 opacity-0"
                )}
              >
                Continue
              </span>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  phase === "submitting" ? "opacity-100" : "opacity-0"
                )}
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-all",
                  phase === "success"
                    ? "scale-100 opacity-100"
                    : "scale-90 opacity-0"
                )}
              >
                <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
              </span>
            </AuthPrimaryButton>
          </div>
        </form>
      </AuthBody>
    </AuthScreen>
  );
}
