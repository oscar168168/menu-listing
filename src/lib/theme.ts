import type { CSSProperties } from "react";
import type { TenantMeta } from "@/types/menu";

export const DEFAULT_PRIMARY_COLOR = "#18181B";
export const LIGHT_FOREGROUND = "#FFFFFF";
export const DARK_FOREGROUND = "#09090B";

export interface ThemePreset {
  name: string;
  hex: string;
  note: string;
}

export const CURATED_THEME_PRESETS: ThemePreset[] = [
  { name: "Ocean Slate", hex: "#1E293B", note: "Deep coastal slate" },
  { name: "Terracotta", hex: "#B45309", note: "Kep coastal clay" },
  { name: "Obsidian", hex: "#18181B", note: "Pure monochrome" },
  { name: "Botanical", hex: "#14532D", note: "Kampot pepper green" },
  { name: "Vermilion", hex: "#B91C1C", note: "Editorial chili" },
  { name: "Cobalt", hex: "#1D4ED8", note: "Swiss marine" },
  { name: "Saffron", hex: "#EAB308", note: "High-contrast gold" },
  { name: "Warm Clay", hex: "#C2410C", note: "Ember grill" },
];

export interface ContrastMetrics {
  primary: string;
  foreground: typeof LIGHT_FOREGROUND | typeof DARK_FOREGROUND;
  contrastWithWhite: number;
  contrastWithDark: number;
  selectedContrast: number;
  relativeLuminance: number;
  passesAA: boolean;
  passesAALarge: boolean;
  passesAAA: boolean;
  rating: "AAA" | "AA" | "AA Large" | "Low";
  subtleBg: string;
  subtleBorder: string;
}

const HEX_6_RE = /^#([0-9a-fA-F]{6})$/;
const HEX_3_RE = /^#([0-9a-fA-F]{3})$/;

/**
 * Normalizes a hex color string to uppercase #RRGGBB format.
 * Returns null if the input is not a valid 3- or 6-digit hex color.
 */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (HEX_6_RE.test(prefixed)) {
    return prefixed.toUpperCase();
  }

  const shortMatch = HEX_3_RE.exec(prefixed);
  if (shortMatch?.[1]) {
    const [r, g, b] = shortMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return null;
}

export function sanitizeHex(input: string | null | undefined): string {
  if (!input) return DEFAULT_PRIMARY_COLOR;
  return normalizeHex(input) ?? DEFAULT_PRIMARY_COLOR;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const safe = sanitizeHex(hex);
  const value = parseInt(safe.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/**
 * Computes WCAG 2.1 relative luminance for an sRGB channel (0..255).
 */
function linearizeChannel(channel255: number): number {
  const sRGB = channel255 / 255;
  return sRGB <= 0.04045
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = linearizeChannel(r);
  const G = linearizeChannel(g);
  const B = linearizeChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Computes WCAG 2.1 contrast ratio between two hex colors (range 1..21).
 */
export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Derives WCAG 2.1 compliant foreground color (#FFFFFF or #09090B)
 * and subtle color tokens for any tenant primary hex color.
 */
export function computeThemeContrast(
  hexInput: string | null | undefined
): ContrastMetrics {
  const primary = sanitizeHex(hexInput);
  const relativeLuminance = getRelativeLuminance(primary);
  const contrastWithWhite = getContrastRatio(primary, LIGHT_FOREGROUND);
  const contrastWithDark = getContrastRatio(primary, DARK_FOREGROUND);

  const foreground =
    contrastWithWhite >= contrastWithDark ? LIGHT_FOREGROUND : DARK_FOREGROUND;
  const selectedContrast = Math.max(contrastWithWhite, contrastWithDark);

  const passesAAA = selectedContrast >= 7.0;
  const passesAA = selectedContrast >= 4.5;
  const passesAALarge = selectedContrast >= 3.0;

  let rating: ContrastMetrics["rating"] = "Low";
  if (passesAAA) rating = "AAA";
  else if (passesAA) rating = "AA";
  else if (passesAALarge) rating = "AA Large";

  return {
    primary,
    foreground,
    contrastWithWhite: Number(contrastWithWhite.toFixed(2)),
    contrastWithDark: Number(contrastWithDark.toFixed(2)),
    selectedContrast: Number(selectedContrast.toFixed(2)),
    relativeLuminance: Number(relativeLuminance.toFixed(4)),
    passesAA,
    passesAALarge,
    passesAAA,
    rating,
    subtleBg: `color-mix(in srgb, ${primary} 10%, transparent)`,
    subtleBorder: `color-mix(in srgb, ${primary} 24%, transparent)`,
  };
}

/**
 * Returns inline CSS custom properties to inject server-side into layout/page roots
 * so there is zero flash of unstyled color (FOUC).
 */
export function getTenantThemeStyle(
  hexInput: string | null | undefined
): CSSProperties {
  const metrics = computeThemeContrast(hexInput);
  const { r, g, b } = hexToRgb(metrics.primary);

  return {
    ["--brand-primary" as string]: metrics.primary,
    ["--brand-primary-foreground" as string]: metrics.foreground,
    ["--brand-primary-subtle" as string]: `color-mix(in srgb, ${metrics.primary} 10%, transparent)`,
    ["--brand-primary-subtle-fallback" as string]: `rgba(${r}, ${g}, ${b}, 0.10)`,
    ["--brand-primary-border" as string]: `color-mix(in srgb, ${metrics.primary} 24%, transparent)`,
  };
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) — US Dollar" },
  { code: "KHR", symbol: "៛", label: "KHR (៛) — Cambodian Riel" },
] as const;

export function formatPrice(
  amount: number,
  currencyCode = "USD",
  customSymbol?: string
): string {
  if (currencyCode === "KHR") {
    return `${Math.round(amount).toLocaleString("en-US")} ៛`;
  }
  const zeroDecimal = currencyCode === "JPY";
  const formattedNumber = zeroDecimal
    ? Math.round(amount).toLocaleString("en-US")
    : amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  const symbol =
    customSymbol && customSymbol.trim().length > 0
      ? customSymbol
      : currencyCode === "EUR"
        ? "€"
        : currencyCode === "JPY"
          ? "¥"
          : "$";

  return `${symbol}${formattedNumber}`;
}

export function parseTenantMeta(raw: unknown): TenantMeta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const pickString = (key: string): string | undefined =>
    typeof obj[key] === "string" && obj[key].trim().length > 0
      ? obj[key].trim()
      : undefined;

  return {
    tagline: pickString("tagline") ?? pickString("taglineEn"),
    taglineKm: pickString("taglineKm"),
    taglineEn: pickString("taglineEn") ?? pickString("tagline"),
    openingHours: pickString("openingHours"),
    address: pickString("address"),
    phone: pickString("phone"),
    telegramUrl: pickString("telegramUrl"),
    facebookUrl: pickString("facebookUrl"),
    googleMapsUrl: pickString("googleMapsUrl"),
    wifiName: pickString("wifiName"),
    wifiPassword: pickString("wifiPassword"),
    footerNote: pickString("footerNote"),
    footerNoteKm: pickString("footerNoteKm"),
    serviceNote: pickString("serviceNote"),
    currencySymbol: pickString("currencySymbol"),
  };
}
