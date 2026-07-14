import { z } from "zod";
import { isValidCurrencyCode } from "@/lib/currency";

export const emailAuthSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .min(2, "Enter a display name with at least 2 characters")
    .max(50, "Display name can't be longer than 50 characters"),
  homeCurrency: z
    .string()
    .min(1, "Select your home currency")
    .refine(isValidCurrencyCode, "Select a valid currency code"),
});

export const displayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a display name with at least 2 characters")
    .max(50, "Display name can't be longer than 50 characters"),
});

export type EmailAuthFormData = z.infer<typeof emailAuthSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;
export type DisplayNameFormData = z.infer<typeof displayNameSchema>;
