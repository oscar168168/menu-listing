import type {
  KhrRounding,
  Locale,
  PrimaryCurrency,
  WeightUnit,
} from "@/types/menu";
import { formatWeightUnit } from "@/lib/i18n";

export interface DualCurrencyConfig {
  primaryCurrency: PrimaryCurrency;
  showDualCurrency: boolean;
  exchangeRate: number;
  khrRounding: KhrRounding;
}

export interface FormattedDualPrice {
  primary: string;
  secondary: string | null;
}

export function normalizePrimaryCurrency(raw?: string | null): PrimaryCurrency {
  return raw?.toUpperCase() === "KHR" ? "KHR" : "USD";
}

export function normalizeKhrRounding(raw?: number | null): KhrRounding {
  return raw === 500 ? 500 : 100;
}

export function normalizeExchangeRate(raw?: number | null): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 1000) {
    return 4100;
  }
  return Math.round(raw);
}

/**
 * Rounds a KHR amount cleanly to the nearest 100 ៛ or 500 ៛.
 */
export function roundKhr(amount: number, rounding: KhrRounding = 100): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount / rounding) * rounding;
}

export function convertUsdToKhr(
  usd: number,
  exchangeRate = 4100,
  rounding: KhrRounding = 100
): number {
  return roundKhr(usd * normalizeExchangeRate(exchangeRate), rounding);
}

export function convertKhrToUsd(khr: number, exchangeRate = 4100): number {
  const rate = normalizeExchangeRate(exchangeRate);
  return Math.round((khr / rate) * 100) / 100;
}

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const KHR_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatUsd(amount: number): string {
  return `$${USD_FORMATTER.format(amount)}`;
}

export function formatKhr(amount: number): string {
  return `${KHR_FORMATTER.format(Math.round(amount) || 0)} ៛`;
}

/**
 * Formats an amount stored in the tenant's primary currency into primary + optional secondary currency.
 * Supports optional weight unit suffix (e.g. "$18.00 / kg" and "73,800 ៛ / kg").
 */
export function formatDualPrice(
  amount: number,
  config: DualCurrencyConfig,
  options?: {
    weightUnit?: WeightUnit | null;
    locale?: Locale;
    prefix?: string;
    includeUnitOnSecondary?: boolean;
  }
): FormattedDualPrice {
  const locale = options?.locale ?? "en";
  const unitSuffix = options?.weightUnit
    ? ` ${formatWeightUnit(options.weightUnit, locale)}`
    : "";
  const prefix = options?.prefix ? `${options.prefix} ` : "";
  const secondaryUnit =
    options?.includeUnitOnSecondary && unitSuffix ? unitSuffix : "";

  if (config.primaryCurrency === "USD") {
    const primary = `${prefix}${formatUsd(amount)}${unitSuffix}`;
    if (!config.showDualCurrency) {
      return { primary, secondary: null };
    }
    const khr = convertUsdToKhr(
      amount,
      config.exchangeRate,
      config.khrRounding
    );
    return {
      primary,
      secondary: `${formatKhr(khr)}${secondaryUnit}`,
    };
  }

  // KHR-primary tenant (e.g. Kep Bay Kitchen)
  const cleanKhr = roundKhr(amount, config.khrRounding);
  const primary = `${prefix}${formatKhr(cleanKhr)}${unitSuffix}`;
  if (!config.showDualCurrency) {
    return { primary, secondary: null };
  }
  const usd = convertKhrToUsd(cleanKhr, config.exchangeRate);
  return {
    primary,
    secondary: `${formatUsd(usd)}${secondaryUnit}`,
  };
}

/**
 * Formats an optional market-price estimated range (e.g. "$24.00 – $32.00 / kg").
 */
export function formatMarketRange(
  min: number | null | undefined,
  max: number | null | undefined,
  config: DualCurrencyConfig,
  options?: { weightUnit?: WeightUnit | null; locale?: Locale }
): FormattedDualPrice | null {
  if (min == null && max == null) return null;
  const locale = options?.locale ?? "en";
  const unitSuffix = options?.weightUnit
    ? ` ${formatWeightUnit(options.weightUnit, locale)}`
    : "";

  const low = min ?? max ?? 0;
  const high = max ?? min ?? 0;

  if (config.primaryCurrency === "USD") {
    const primary =
      low === high
        ? `${formatUsd(low)}${unitSuffix}`
        : `${formatUsd(low)} – ${formatUsd(high)}${unitSuffix}`;
    if (!config.showDualCurrency) return { primary, secondary: null };
    const lowKhr = convertUsdToKhr(low, config.exchangeRate, config.khrRounding);
    const highKhr = convertUsdToKhr(
      high,
      config.exchangeRate,
      config.khrRounding
    );
    const secondary =
      lowKhr === highKhr
        ? formatKhr(lowKhr)
        : `${formatKhr(lowKhr)} – ${formatKhr(highKhr)}`;
    return { primary, secondary };
  }

  const lowKhr = roundKhr(low, config.khrRounding);
  const highKhr = roundKhr(high, config.khrRounding);
  const primary =
    lowKhr === highKhr
      ? `${formatKhr(lowKhr)}${unitSuffix}`
      : `${formatKhr(lowKhr)} – ${formatKhr(highKhr)}${unitSuffix}`;
  if (!config.showDualCurrency) return { primary, secondary: null };
  const lowUsd = convertKhrToUsd(lowKhr, config.exchangeRate);
  const highUsd = convertKhrToUsd(highKhr, config.exchangeRate);
  const secondary =
    lowUsd === highUsd
      ? formatUsd(lowUsd)
      : `${formatUsd(lowUsd)} – ${formatUsd(highUsd)}`;
  return { primary, secondary };
}

export function formatSurcharge(
  surcharge: number,
  config: DualCurrencyConfig
): FormattedDualPrice {
  if (surcharge <= 0) {
    return { primary: "+$0", secondary: null };
  }
  const formatted = formatDualPrice(surcharge, config);
  return {
    primary: `+${formatted.primary}`,
    secondary: formatted.secondary ? `+${formatted.secondary}` : null,
  };
}
