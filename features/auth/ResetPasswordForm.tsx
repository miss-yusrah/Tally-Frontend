"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import {
  AuthBackButton,
  AuthBody,
  AuthField,
  AuthLogo,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthStackHeader,
  AuthStackScreen,
} from "./AuthScreen";
import {
  getResetPasswordRuleStatus,
  isResetPasswordValid,
} from "./passwordRules";
import { type ResetPasswordFormData } from "./schemas";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch } = useForm<ResetPasswordFormData>({
    resolver: lazyZodResolver<ResetPasswordFormData>(
      () => import("./schemas").then((m) => m.resetPasswordSchema)
    ),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
  const typed = password.length > 0;
  const ruleStatus = getResetPasswordRuleStatus(password);
  const mismatch =
    confirmPassword.length > 0 && confirmPassword !== password;
  const enabled =
    isResetPasswordValid(password) &&
    confirmPassword === password &&
    confirmPassword.length > 0 &&
    !submitting;

  const onSubmit = () => {
    if (!enabled) return;
    setSubmitting(true);
    router.push("/forgot-password/success");
  };

  return (
    <AuthStackScreen>
      <AuthBackButton href="/forgot-password/otp" />
      <AuthLogo />
      <AuthStackHeader
        title="Create new password"
        subtitle="Choose a new password"
      />

      <AuthBody className="flex-1">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full min-w-0 flex-1 flex-col"
        >
          <AuthField label="Password" htmlFor="reset-password">
            <AuthPasswordInput
              id="reset-password"
              autoComplete="new-password"
              autoFocus
              placeholder="Enter your password"
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              {...register("password")}
            />
            <ul className="mt-2 space-y-1" aria-live="polite">
              {ruleStatus.map((rule) => (
                <li
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-2 text-[0.8125rem] leading-5",
                    !typed && "text-[#C7C7CC]",
                    typed && rule.met && "text-[#22C55E]",
                    typed && !rule.met && "text-[#F43F5E]"
                  )}
                >
                  <Check
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {rule.label}
                </li>
              ))}
            </ul>
          </AuthField>

          <div className="mt-4 w-full min-w-0">
            <AuthField
              label="Repeat Password"
              htmlFor="reset-confirm"
              error={mismatch ? "Password does not match" : undefined}
            >
              <AuthPasswordInput
                id="reset-confirm"
                autoComplete="new-password"
                placeholder="Repeat password"
                error={mismatch}
                visible={showConfirm}
                onToggleVisible={() => setShowConfirm((v) => !v)}
                {...register("confirmPassword")}
              />
            </AuthField>
          </div>

          <div className="mt-auto pt-16">
            <AuthPrimaryButton
              variant="stack"
              enabled={enabled}
              disabled={!enabled}
            >
              {submitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Create password"
              )}
            </AuthPrimaryButton>
          </div>
        </form>
      </AuthBody>
    </AuthStackScreen>
  );
}
