"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import {
  AuthBackButton,
  AuthBody,
  AuthField,
  AuthPrimaryButton,
  AuthStackHeader,
  AuthStackScreen,
  useAuthSession,
} from "@/features/auth";
import { HomeProfileAvatarLink } from "@/features/home";
import { OnboardingCurrencyPicker } from "@/features/onboarding";
import { type CreateTripFormData } from "@/features/trips/schemas";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";
import { getCurrencyByCode } from "@/lib/currency";
import { useAddToast, useCreateGroupDraftStore } from "@/store";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5921B5] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Figma create-group input — 40px pill, #E5E5E5, shadow-xs */
const groupFieldClass = cn(
  "flex min-h-[40px] w-full items-center gap-3 self-stretch",
  "rounded-full border border-[#E5E5E5] bg-white px-4 py-[9.5px]",
  "text-[16px] font-normal leading-none text-[#15131A]",
  "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
  "appearance-none outline-none",
  "placeholder:font-normal placeholder:text-[#C7C7CC]",
  "focus:border-[#5921B5] focus:outline-none focus:ring-2 focus:ring-[#5921B5]/20"
);

export function CreateGroupForm() {
  const router = useRouter();
  const { user } = useAuthSession();
  const setDraft = useCreateGroupDraftStore((s) => s.setDraft);
  const addToast = useAddToast();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyFieldRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CreateTripFormData>({
    resolver: lazyZodResolver<CreateTripFormData>(
      () => import("@/features/trips/schemas").then((m) => m.createTripSchema)
    ),
    mode: "onChange",
    defaultValues: {
      name: "",
      baseCurrency: "",
    },
  });

  const baseCurrency = watch("baseCurrency");
  const selectedCurrency = baseCurrency
    ? getCurrencyByCode(baseCurrency)
    : undefined;

  const onSubmit = (data: CreateTripFormData) => {
    if (!user) {
      addToast({ message: "You need to be signed in.", variant: "error" });
      return;
    }
    setDraft({
      name: data.name.trim(),
      baseCurrency: data.baseCurrency,
    });
    router.push("/trips/new/cover");
  };

  const enabled = isValid;

  return (
    <AuthStackScreen>
      <div className="flex items-center justify-between">
        <AuthBackButton href="/dashboard" label="Back to home" />
        <HomeProfileAvatarLink avatarUrl={user?.avatarUrl} />
      </div>

      <AuthStackHeader
        title="Create group"
        subtitle="Start building experiences with your crew"
      />

      <AuthBody className="flex-1">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full min-w-0 flex-1 flex-col"
        >
          <div className="flex w-full min-w-0 flex-col gap-6">
            <AuthField
              label="Group name"
              htmlFor="group-name"
              error={errors.name?.message}
            >
              <input
                id="group-name"
                autoComplete="off"
                autoFocus
                placeholder="Display name"
                className={cn(
                  groupFieldClass,
                  errors.name && "border-[#F43F5E]",
                  focusRing
                )}
                {...register("name")}
              />
            </AuthField>

            <div ref={currencyFieldRef} className="relative w-full min-w-0">
              <AuthField
                label="Base currency"
                htmlFor="baseCurrency"
                error={errors.baseCurrency?.message}
              >
                <Controller
                  name="baseCurrency"
                  control={control}
                  render={() => (
                    <button
                      type="button"
                      id="baseCurrency"
                      aria-haspopup="listbox"
                      aria-expanded={currencyOpen}
                      onClick={() => setCurrencyOpen((open) => !open)}
                      className={cn(
                        groupFieldClass,
                        "justify-between text-left",
                        errors.baseCurrency && "border-[#F43F5E]",
                        focusRing
                      )}
                    >
                      <span
                        className={cn(
                          "flex items-center gap-3 text-[16px] leading-none",
                          selectedCurrency ? "text-[#15131A]" : "text-[#C7C7CC]"
                        )}
                      >
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
                  )}
                />
              </AuthField>

              {currencyOpen ? (
                <OnboardingCurrencyPicker
                  selectedCode={baseCurrency}
                  containerRef={currencyFieldRef}
                  onSelect={(currency) =>
                    setValue("baseCurrency", currency.code, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  onClose={() => setCurrencyOpen(false)}
                  className="mt-2 rounded-2xl border border-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                />
              ) : null}
            </div>
          </div>

          <div className="mt-auto pt-16">
            <AuthPrimaryButton
              variant="stack"
              enabled={enabled}
              disabled={!enabled}
            >
              Continue
            </AuthPrimaryButton>
          </div>
        </form>
      </AuthBody>
    </AuthStackScreen>
  );
}
