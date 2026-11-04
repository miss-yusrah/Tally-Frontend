"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import {
  AuthBody,
  AuthField,
  AuthGoogleButton,
  AuthHeader,
  AuthInput,
  AuthLogo,
  AuthOrDivider,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthScreen,
  AuthSwitchLink,
  AuthTerms,
} from "./AuthScreen";
import { getPasswordRuleStatus } from "./passwordRules";
import { type SignUpFormData } from "./schemas";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";
import { mockSignIn } from "@/lib/auth/mock-session";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

export function SignUpForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: lazyZodResolver<SignUpFormData>(
      () => import("./schemas").then((m) => m.signUpSchema)
    ),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const ruleStatus = getPasswordRuleStatus(password ?? "");
  const showRules = (password?.length ?? 0) > 0;

  const finishAuth = (email: string) => {
    const user = mockSignIn(email);
    setUser(user);
    if (user.onboardingComplete) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding/setup");
    }
  };

  const onGoogle = () => {
    setSubmitting(true);
    finishAuth("demo@gmail.com");
  };

  const onSubmit = (data: SignUpFormData) => {
    setSubmitting(true);
    finishAuth(data.email);
  };

  return (
    <AuthScreen>
      <AuthLogo />
      <AuthHeader
        title="Create your account"
        subtitle="Let's get you started in a few minutes"
      />

      <AuthBody>
        <AuthGoogleButton
          label="Sign up with Google"
          onClick={onGoogle}
          disabled={submitting}
        />

        <AuthOrDivider />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex w-full min-w-0 flex-col gap-4"
        >
          <AuthField
            label="E-mail"
            htmlFor="signup-email"
            error={errors.email?.message}
          >
            <AuthInput
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Your e-mail address"
              error={!!errors.email}
              {...register("email")}
            />
          </AuthField>

          <AuthField
            label="Password"
            htmlFor="signup-password"
            error={!showRules ? errors.password?.message : undefined}
          >
            <AuthPasswordInput
              id="signup-password"
              autoComplete="new-password"
              placeholder="Enter your password"
              error={!!errors.password}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              {...register("password")}
            />
            {showRules && (
              <ul className="mt-2 space-y-1" aria-live="polite">
                {ruleStatus.map((rule) => (
                  <li
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-2 text-[0.8125rem]",
                      rule.met ? "text-[#059669]" : "text-[#C7C7CC]"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        rule.met ? "opacity-100" : "opacity-40"
                      )}
                      aria-hidden
                    />
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </AuthField>

          <AuthField
            label="Repeat password"
            htmlFor="signup-confirm"
            error={errors.confirmPassword?.message}
          >
            <AuthPasswordInput
              id="signup-confirm"
              autoComplete="new-password"
              placeholder="Repeat password"
              error={!!errors.confirmPassword}
              visible={showConfirm}
              onToggleVisible={() => setShowConfirm((v) => !v)}
              {...register("confirmPassword")}
            />
          </AuthField>

          <AuthTerms />

          <AuthPrimaryButton
            enabled={isValid && !submitting}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign up"
            )}
          </AuthPrimaryButton>

          <AuthSwitchLink
            prompt="Already have an account?"
            href="/sign-in"
            label="Sign in"
          />
        </form>
      </AuthBody>
    </AuthScreen>
  );
}
