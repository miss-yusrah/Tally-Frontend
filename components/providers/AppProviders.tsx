"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ToastContainer } from "@/components/ui/Toast";
// Direct module import — avoids pulling the whole auth feature barrel
// (AuthScreen, forms, HeroMotion, …) into the root shared chunk.
import { AuthSessionHydrator } from "@/features/auth/useAuthSession";
import { LocaleHydrator } from "./LocaleHydrator";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthSessionHydrator />
      <LocaleHydrator />
      {children}
      <BottomSheet />
      <ToastContainer />
    </>
  );
}
