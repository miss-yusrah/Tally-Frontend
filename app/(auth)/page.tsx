"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmailAuthSheet, GoogleIcon, HeroMotion } from "@/features/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useOpenBottomSheet, useCloseBottomSheet } from "@/store";
import { cn } from "@/lib/utils";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  magic_link:
    "That sign-in link didn't work. Request a fresh one and open it on this device.",
  oauth: "Google sign-in didn't complete. Please try again.",
};

function LandingContent() {
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const openBottomSheet = useOpenBottomSheet();
  const closeBottomSheet = useCloseBottomSheet();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setAuthError(
        AUTH_ERROR_MESSAGES[error] ??
          "Something went wrong signing you in. Try again or use email."
      );
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    if (!isSupabaseConfigured()) {
      setAuthError(
        "Supabase isn't configured yet. Add your Supabase keys to .env.local."
      );
      return;
    }
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setAuthError(error.message);
        setGoogleLoading(false);
      }
      // On success the browser is redirected to Google — no further work here.
    } catch {
      setAuthError("Couldn't start Google sign-in. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleEmailOpen = () => {
    openBottomSheet(<EmailAuthSheet onClose={closeBottomSheet} />, {
      height: "60",
    });
  };

  return (
    <div className="relative min-h-dvh bg-[#0A0A0F]">
      {/* Same bottom-pinned footer layout as before; redesign visuals stay */}
      <div className="relative z-10 mx-auto grid min-h-dvh max-w-[430px] grid-rows-[auto_1fr_auto] safe-top safe-bottom">
        <header className="px-6 pt-[80px]">
          <h1 className="text-[40px] font-bold leading-none tracking-[-0.02em] text-[#F8F8FF]">
            Tally
          </h1>
          <p className="mt-1 text-[17px] font-medium text-[#94A3B8]">
            Split expenses. Stay friends.
          </p>
        </header>

        <section className="flex w-full flex-1 items-center justify-center px-6">
          <HeroMotion />
        </section>

        <footer className="px-6 pb-6">
          {authError && (
            <p
              role="alert"
              className="mb-3 rounded-[12px] border border-[#F43F5E33] bg-[#F43F5E14] px-4 py-3 text-[13px] leading-relaxed text-[#F43F5E]"
            >
              {authError}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className={cn(
                "relative flex h-[52px] w-full items-center justify-center rounded-[12px] bg-[#E8E8F0]",
                "text-[15px] font-semibold text-[#0A0A0F]",
                "transition-transform duration-fast ease-tally active:scale-[0.98]",
                "disabled:opacity-70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
              )}
            >
              {googleLoading ? (
                <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-[#0A0A0F]/20 border-t-[#0A0A0F]" />
              ) : (
                <>
                  <GoogleIcon className="absolute left-5" />
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEmailOpen}
              className={cn(
                "flex h-[52px] w-full items-center justify-center rounded-[12px]",
                "border border-[#ffffff1a] bg-transparent",
                "text-[15px] font-semibold text-[#F8F8FF]",
                "transition-all duration-fast ease-tally active:scale-[0.98]",
                "hover:bg-[#ffffff08]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
              )}
            >
              Continue with email
            </button>
          </div>

          <p className="mx-auto mt-11 max-w-[280px] text-center text-[12px] leading-[1.5] text-[#475569]">
            By continuing, you agree to Tally&apos;s{" "}
            <a href="/terms" className="text-[#94A3B8] underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[#94A3B8] underline">
              Privacy Policy
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  );
}
