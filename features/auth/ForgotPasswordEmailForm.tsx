"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  AuthBackButton,
  AuthBody,
  AuthField,
  AuthInput,
  AuthLogo,
  AuthPrimaryButton,
  AuthStackHeader,
  AuthStackScreen,
} from "./AuthScreen";
import { type EmailAuthFormData } from "./schemas";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";

export function ForgotPasswordEmailForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<EmailAuthFormData>({
    resolver: lazyZodResolver<EmailAuthFormData>(
      () => import("./schemas").then((m) => m.emailAuthSchema)
    ),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const enabled = isValid && !submitting;

  const onSubmit = (data: EmailAuthFormData) => {
    setSubmitting(true);
    const email = encodeURIComponent(data.email.trim());
    router.push(`/forgot-password/otp?email=${email}`);
  };

  return (
    <AuthStackScreen>
      <AuthBackButton href="/sign-in" />
      <AuthLogo />
      <AuthStackHeader
        title="Forgot password?"
        subtitle={"We all forget sometimes. Enter your email, we\u2019ll send a one-time code to reset your password"}
      />

      <AuthBody className="flex-1">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full min-w-0 flex-1 flex-col"
        >
          <AuthField
            label="E-mail"
            htmlFor="forgot-email"
            error={errors.email?.message}
          >
            <AuthInput
              id="forgot-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="Your e-mail address"
              error={!!errors.email}
              className="text-[#15131A]"
              {...register("email")}
            />
          </AuthField>

          <div className="mt-auto pt-16">
            <AuthPrimaryButton
              variant="stack"
              enabled={enabled}
              disabled={!enabled}
            >
              {submitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Verify"
              )}
            </AuthPrimaryButton>
          </div>
        </form>
      </AuthBody>
    </AuthStackScreen>
  );
}
