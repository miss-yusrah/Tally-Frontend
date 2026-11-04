"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { GoogleIcon } from "./GoogleIcon";
import {
  authBackBtnClass,
  authBodyClass,
  authErrorClass,
  authFieldBorder,
  authFieldClass,
  authFieldClassRounded,
  authFooterClass,
  authGoogleBtnClass,
  authHeaderClass,
  authHeadingClass,
  authLabelClass,
  authLinkClass,
  authLogoWrapClass,
  authMutedClass,
  authOrDividerClass,
  authPrimaryBtnClass,
  authShellClass,
  authStackCtaClass,
  authStackHeaderClass,
  authStackHeadingClass,
  authStackShellClass,
  authStackSubtitleClass,
  authSubtitleClass,
} from "./authFormStyles";
import { cn } from "@/lib/utils";

/* ─── Shell ─────────────────────────────────────────────────────────────── */

interface AuthScreenProps {
  children: ReactNode;
  className?: string;
}

/** Shared light-auth frame: same 24px inset as onboarding Get started. */
export function AuthScreen({ children, className }: AuthScreenProps) {
  return <div className={cn(authShellClass, className)}>{children}</div>;
}

/** Left-aligned stack used by forgot-password / OTP (back + heading + bottom CTA). */
export function AuthStackScreen({ children, className }: AuthScreenProps) {
  return <div className={cn(authStackShellClass, className)}>{children}</div>;
}

export function AuthBackButton({
  href,
  label = "Go back",
}: {
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => (href ? router.push(href) : router.back())}
      className={authBackBtnClass}
    >
      <ArrowLeft className="h-6 w-6" strokeWidth={1.75} />
    </button>
  );
}

export function AuthStackHeader({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <header className={authStackHeaderClass}>
      <h1 className={authStackHeadingClass}>{title}</h1>
      <p className={authStackSubtitleClass}>{subtitle}</p>
    </header>
  );
}

/** Tabr mark — ring logo centered on every light auth screen. */
export function AuthLogo() {
  return (
    <div className={authLogoWrapClass}>
      <Image
        src="/tabr/brand/logo.webp"
        alt="Tabr"
        width={84}
        height={84}
        priority
        className="h-12 w-12 object-contain"
      />
    </div>
  );
}

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className={authHeaderClass}>
      <h1 className={authHeadingClass}>{title}</h1>
      <p className={authSubtitleClass}>{subtitle}</p>
    </header>
  );
}

export function AuthBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(authBodyClass, className)}>{children}</div>;
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <p className={authFooterClass}>{children}</p>;
}

/* ─── Controls ──────────────────────────────────────────────────────────── */

export function AuthOrDivider() {
  return (
    <div className={authOrDividerClass} role="separator" aria-label="or">
      <div className="h-px flex-1 bg-[#E0E0E0]" />
      <span className="text-xs font-medium uppercase tracking-wide text-[#C7C7CC]">
        OR
      </span>
      <div className="h-px flex-1 bg-[#E0E0E0]" />
    </div>
  );
}

export function AuthGoogleButton({
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={authGoogleBtnClass} {...props}>
      <GoogleIcon />
      {label}
    </button>
  );
}

export function AuthPrimaryButton({
  enabled,
  children,
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  enabled: boolean;
  variant?: "default" | "stack";
}) {
  return (
    <button
      type="submit"
      className={cn(
        variant === "stack" ? authStackCtaClass(enabled) : authPrimaryBtnClass(enabled),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={authLabelClass}>
      {children}
    </label>
  );
}

export function AuthError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className={authErrorClass}>{children}</p>;
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  /** `pill` = sign-in/up; `rounded` = setup fields */
  variant?: "pill" | "rounded";
};

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput(
    { error, variant = "pill", className, ...props },
    ref
  ) {
    return (
      <input
        ref={ref}
        className={cn(
          variant === "rounded" ? authFieldClassRounded : authFieldClass,
          authFieldBorder(error),
          className
        )}
        {...props}
      />
    );
  }
);

export const AuthPasswordInput = forwardRef<
  HTMLInputElement,
  AuthInputProps & {
    visible: boolean;
    onToggleVisible: () => void;
  }
>(function AuthPasswordInput(
  { error, visible, onToggleVisible, className, variant = "pill", ...props },
  ref
) {
  return (
    <div className="relative w-full min-w-0">
      <AuthInput
        ref={ref}
        type={visible ? "text" : "password"}
        error={error}
        variant={variant}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E93]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="h-5 w-5" strokeWidth={1.75} />
        ) : (
          <Eye className="h-5 w-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
});

export function AuthField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full min-w-0">
      <AuthLabel htmlFor={htmlFor}>{label}</AuthLabel>
      {children}
      <AuthError>{error}</AuthError>
    </div>
  );
}

export function AuthTerms() {
  return (
    <p
      className={cn(
        "w-full pt-1 text-center text-[0.8125rem] leading-relaxed",
        authMutedClass
      )}
    >
      By continuing, you agree to the{" "}
      <Link href="/terms" className={authLinkClass}>
        terms of service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className={authLinkClass}>
        privacy policy
      </Link>
    </p>
  );
}

export function AuthSwitchLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <AuthFooter>
      {prompt}{" "}
      <Link href={href} className={authLinkClass}>
        {label}
      </Link>
    </AuthFooter>
  );
}
