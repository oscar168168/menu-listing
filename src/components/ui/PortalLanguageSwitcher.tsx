"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  PORTAL_COPY,
  PORTAL_LOCALE_COOKIE,
  PORTAL_LOCALE_STORAGE_KEY,
  parsePortalLocale,
} from "@/lib/portal-i18n";
import type { Locale } from "@/types/menu";

const portalLocaleListeners = new Set<() => void>();

function emitPortalLocaleUpdate() {
  for (const listener of portalLocaleListeners) {
    listener();
  }
}

function subscribePortalLocale(listener: () => void) {
  portalLocaleListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PORTAL_LOCALE_STORAGE_KEY) {
      listener();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    portalLocaleListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function readStoredPortalLocale(fallback: Locale): Locale {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(PORTAL_LOCALE_STORAGE_KEY);
    if (stored === "km" || stored === "en") return stored;
    const cookieMatch = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${PORTAL_LOCALE_COOKIE}=`));
    if (cookieMatch) {
      return parsePortalLocale(cookieMatch.split("=")[1]);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function setPortalLocale(next: Locale): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PORTAL_LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage quota errors
    }
    document.cookie = `${PORTAL_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }
  emitPortalLocaleUpdate();
}

export function usePortalLocale(
  initialLocale: Locale = "km"
): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore(
    subscribePortalLocale,
    () => readStoredPortalLocale(initialLocale),
    () => initialLocale
  );
  const updateLocale = useCallback((next: Locale) => {
    setPortalLocale(next);
  }, []);
  return [locale, updateLocale];
}

interface PortalLanguageSwitcherProps {
  locale: Locale;
  onChange: (next: Locale) => void;
  compact?: boolean;
}

export function PortalLanguageSwitcher({
  locale,
  onChange,
  compact = false,
}: PortalLanguageSwitcherProps) {
  const t = PORTAL_COPY[locale].common;

  return (
    <div
      role="group"
      aria-label={t.language}
      className="inline-flex shrink-0 items-center rounded-lg border border-zinc-200 bg-[#FAFAFA] p-0.5 text-[12px]"
    >
      <button
        type="button"
        lang="km"
        aria-pressed={locale === "km"}
        onClick={() => onChange("km")}
        className={`rounded-md font-medium transition-colors ${
          compact ? "px-2 py-1 text-[11.5px]" : "px-2.5 py-1 text-[12px]"
        } ${
          locale === "km"
            ? "border border-zinc-200 bg-white text-zinc-950 shadow-[0_1px_1px_rgba(0,0,0,0.03)]"
            : "border border-transparent text-zinc-500 hover:text-zinc-900"
        }`}
      >
        {t.khmer}
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
        className={`rounded-md font-medium transition-colors ${
          compact ? "px-2 py-1 text-[11.5px]" : "px-2.5 py-1 text-[12px]"
        } ${
          locale === "en"
            ? "border border-zinc-200 bg-white text-zinc-950 shadow-[0_1px_1px_rgba(0,0,0,0.03)]"
            : "border border-transparent text-zinc-500 hover:text-zinc-900"
        }`}
      >
        {t.english}
      </button>
    </div>
  );
}
