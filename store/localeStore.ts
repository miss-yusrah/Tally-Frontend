import { create } from "zustand";
import {
  DEFAULT_LOCALE,
  isRtlLocale,
  labelForLocale,
  localeFromStoredLanguage,
} from "@/lib/i18n/locales";
import { getMessages } from "@/lib/i18n/messages";
import type { LocaleCode, MessageTree } from "@/lib/i18n/types";

const STORAGE_KEY = "tabr.locale";

/**
 * Non-English catalogs are code-split — fetch on demand and cache in the chunk.
 * English resolves immediately; unknown locales resolve to null (keep current).
 */
function loadLocaleMessages(locale: LocaleCode): Promise<MessageTree | null> {
  return import("@/lib/i18n/asyncCatalogs").then(
    (m) => m.loadLocaleMessages(locale)
  );
}

function readStoredLocale(): LocaleCode {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return localeFromStoredLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

function persistLocale(locale: LocaleCode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function applyDocumentLocale(locale: LocaleCode) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
}

interface LocaleState {
  locale: LocaleCode;
  messages: MessageTree;
  hydrated: boolean;
  hydrate: () => void;
  setLocale: (locale: LocaleCode) => void;
  /** Sync from user.language (mock/API) without fighting local cache. */
  syncFromUserLanguage: (language?: string | null) => void;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  messages: getMessages(DEFAULT_LOCALE),
  hydrated: false,

  hydrate: () => {
    const locale = readStoredLocale();
    applyDocumentLocale(locale);
    set({
      locale,
      messages: getMessages(locale),
      hydrated: true,
    });
    if (locale !== DEFAULT_LOCALE) {
      loadLocaleMessages(locale)
        .then((tree) => {
          // Ignore stale loads if the user switched locale meanwhile.
          if (tree && get().locale === locale) set({ messages: tree });
        })
        .catch(() => {
          /* keep English fallback */
        });
    }
  },

  setLocale: (locale) => {
    persistLocale(locale);
    applyDocumentLocale(locale);
    set({ locale, messages: getMessages(locale) });
    if (locale !== DEFAULT_LOCALE) {
      loadLocaleMessages(locale)
        .then((tree) => {
          if (tree && get().locale === locale) set({ messages: tree });
        })
        .catch(() => {
          /* keep English fallback */
        });
    }
  },

  syncFromUserLanguage: (language) => {
    if (!language?.trim()) return;
    const next = localeFromStoredLanguage(language);
    if (next === get().locale) return;
    // Prefer explicit local cache if already set by the user this session.
    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) return;
    }
    get().setLocale(next);
  },
}));

export const useLocale = () => useLocaleStore((s) => s.locale);
export const useMessages = () => useLocaleStore((s) => s.messages);
export const useSetLocale = () => useLocaleStore((s) => s.setLocale);

export function useT() {
  return useLocaleStore((s) => s.messages);
}

export { labelForLocale };