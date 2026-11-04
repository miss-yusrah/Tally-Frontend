"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
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
import { type SignInFormData } from "./schemas";
import { lazyZodResolver } from "@/lib/forms/lazyZodResolver";
import { authMutedClass } from "./authFormStyles";
import { mockSignIn } from "@/lib/auth/mock-session";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

export function SignInForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignInFormData>({
    resolver: lazyZodResolver<SignInFormData>(
      () => import("./schemas").then((m) => m.signInSchema)
    ),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

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

  const onSubmit = (data: SignInFormData) => {
    setSubmitting(true);
    finishAuth(data.email);
  };

  return (
    <AuthScreen>
      <AuthLogo />
      <AuthHeader
        title="Welcome back"
        subtitle="Let's get back to your plans"
      />

      <AuthBody>
        <AuthGoogleButton
          label="Sign in with Google"
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
            htmlFor="signin-email"
            error={errors.email?.message}
          >
            <AuthInput
              id="signin-email"
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
            htmlFor="signin-password"
            error={errors.password?.message}
          >
            <AuthPasswordInput
              id="signin-password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={!!errors.password}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              {...register("password")}
            />
            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" className={cn("text-sm", authMutedClass)}>
                Forgot password?
              </Link>
            </div>
          </AuthField>

          <AuthTerms />

          <AuthPrimaryButton
            enabled={isValid && !submitting}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Sign in"
            )}
          </AuthPrimaryButton>

          <AuthSwitchLink
            prompt="Don't have an account?"
            href="/sign-up"
            label="Sign up"
          />
        </form>
      </AuthBody>
    </AuthScreen>
  );
}
