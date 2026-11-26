"use client";

import { Minus, Plus, Trash2, Utensils, X } from "lucide-react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import {
  formatDualPrice,
  formatMarketRange,
  type DualCurrencyConfig,
} from "@/lib/currency";
import { formatWeightUnit, UI_COPY } from "@/lib/i18n";
import type { Locale, SerializedTenant, ShortlistEntry } from "@/types/menu";

interface ShortlistModalProps {
  open: boolean;
  onClose: () => void;
  tenant: SerializedTenant;
  locale: Locale;
  entries: ShortlistEntry[];
  tableCode: string;
  onTableCodeChange: (value: string) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onClearAll: () => void;
}

/**
 * Show-to-Waiter Full-Screen High-Contrast Summary.
 * Always displays large Khmer dish names FIRST with crisp English subtext so
 * diners can hand or show their phone directly to waitstaff in noisy seafood halls.
 */
export function ShortlistModal({
  open,
  onClose,
  tenant,
  locale,
  entries,
  tableCode,
  onTableCodeChange,
  onUpdateQty,
  onClearAll,
}: ShortlistModalProps) {
  const t = UI_COPY[locale];
  const currencyConfig: DualCurrencyConfig = {
    primaryCurrency: tenant.currency,
    showDualCurrency: tenant.showDualCurrency,
    exchangeRate: tenant.exchangeRate,
    khrRounding: tenant.khrRounding,
  };

  const hasMarketItems = entries.some((e) => e.pricingType === "MARKET_PRICE");
  const estimatedSubtotal = entries.reduce((sum, entry) => {
    if (entry.pricingType === "MARKET_PRICE") {
      // Only include fixed cooking surcharge if applicable, keep seafood base as market price
      const styleFee = entry.cookingStyle?.surcharge ?? 0;
      return sum + styleFee * entry.quantity;
    }
    const styleFee = entry.cookingStyle?.surcharge ?? 0;
    return sum + (entry.unitPrice + styleFee) * entry.quantity;
  }, 0);

  const subtotalFormatted = formatDualPrice(estimatedSubtotal, currencyConfig, {
    locale,
    localeOnly: true,
  });

  const totalCount = entries.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      variant="sheet"
      lightDismiss={true}
      hideHeader={true}
      ariaLabel={t.shortlistModalTitle}
    >
      <div className="flex flex-col bg-white text-zinc-950">
        {/* High-Contrast Waitstaff Header */}
        <div className="border-b border-zinc-200 bg-zinc-950 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                lang="km"
                className="text-[18px] font-semibold leading-[1.6] text-white"
              >
                {tenant.nameKm || tenant.nameEn}
              </p>
              <p className="text-[12px] text-zinc-400">
                {t.shortlistModalSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shortlist"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Prominent Table Banner */}
          <div className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <label
                htmlFor="shortlist-table-input"
                lang="km"
                className="text-[13px] font-medium text-zinc-300"
              >
                លេខតុ · Table
              </label>
            </div>
            <input
              id="shortlist-table-input"
              type="text"
              maxLength={16}
              value={tableCode}
              onChange={(e) => onTableCodeChange(e.target.value)}
              placeholder="05"
              className="w-28 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-right text-[18px] font-semibold tabular-nums text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
            />
          </div>
        </div>

        {/* Shortlisted Dishes — Large Khmer First, English Subtext */}
        <div className="px-5 py-3">
          {entries.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-zinc-500">
              {t.shortlistEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {entries.map((entry) => {
                const kmPrimary = entry.nameKm || entry.nameEn;
                const enSecondary =
                  entry.nameKm && entry.nameEn && entry.nameKm !== entry.nameEn
                    ? entry.nameEn
                    : null;
                const styleFee = entry.cookingStyle?.surcharge ?? 0;
                const linePrice =
                  entry.pricingType === "MARKET_PRICE"
                    ? null
                    : formatDualPrice(
                        (entry.unitPrice + styleFee) * entry.quantity,
                        currencyConfig,
                        { locale, localeOnly: true }
                      );
                const marketEst =
                  entry.pricingType === "MARKET_PRICE"
                    ? formatMarketRange(
                        entry.marketPriceMin,
                        entry.marketPriceMax,
                        currencyConfig,
                        { weightUnit: entry.weightUnit, locale, localeOnly: true }
                      )
                    : null;

                return (
                  <li key={entry.key} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Large Qty Badge + Large Khmer Title */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="mt-0.5 inline-flex min-w-[2.5rem] items-center justify-center rounded-md bg-brand px-2 py-1 text-[16px] font-bold tabular-nums">
                          ×{entry.quantity}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            lang="km"
                            className="text-[19px] font-semibold leading-[1.6] text-zinc-950"
                          >
                            {kmPrimary}
                          </p>
                          {enSecondary && (
                            <p className="text-[13px] font-medium text-zinc-500">
                              {enSecondary}
                            </p>
                          )}

                          {/* Variant & Weight Unit */}
                          {(entry.variantLabel || entry.weightUnit) && (
                            <p
                              lang="km"
                              className="mt-1 text-[13px] text-zinc-700"
                            >
                              {entry.variantLabelKm
                                ? `${entry.variantLabelKm} · ${entry.variantLabel}`
                                : entry.variantLabel}
                              {entry.weightUnit && (
                                <span className="ml-1 rounded border border-zinc-200 bg-[#FAFAFA] px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
                                  {formatWeightUnit(entry.weightUnit, "km")} ·{" "}
                                  {formatWeightUnit(entry.weightUnit, "en")}
                                </span>
                              )}
                            </p>
                          )}

                          {/* Chosen Cooking Style in Khmer + English */}
                          {entry.cookingStyle && (
                            <div className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 rounded-md border border-brand-subtle bg-brand-subtle px-2.5 py-1">
                              <span
                                lang="km"
                                className="text-[14px] font-semibold text-zinc-950"
                              >
                                {entry.cookingStyle.nameKm ||
                                  entry.cookingStyle.nameEn}
                              </span>
                              {entry.cookingStyle.nameKm &&
                                entry.cookingStyle.nameEn && (
                                  <span className="text-[12px] text-zinc-600">
                                    · {entry.cookingStyle.nameEn}
                                  </span>
                                )}
                            </div>
                          )}

                          {/* Line Price */}
                          <div className="mt-2">
                            {entry.pricingType === "MARKET_PRICE" ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  lang="km"
                                  className="rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-800"
                                >
                                  តាមតម្លៃទីផ្សារ · Market Price
                                </span>
                                {marketEst && (
                                  <span className="text-[12px] tabular-nums text-zinc-500">
                                    {marketEst.primary}
                                  </span>
                                )}
                              </div>
                            ) : (
                              linePrice && (
                                <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                                  <span className="text-[14px] font-semibold text-zinc-950">
                                    {linePrice.primary}
                                  </span>
                                  {linePrice.secondary && (
                                    <span className="text-[12px] text-zinc-500">
                                      {linePrice.secondary}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(entry.key, -1)}
                          aria-label={`Decrease quantity for ${entry.nameEn}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(entry.key, 1)}
                          aria-label={`Increase quantity for ${entry.nameEn}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer Totals & Actions */}
        {entries.length > 0 && (
          <div className="border-t border-zinc-200 bg-[#FAFAFA] px-5 py-4 space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <span
                lang={locale}
                className="text-[13px] font-medium text-zinc-600"
              >
                {t.shortlistEstimatedSubtotal} ({totalCount})
              </span>
              <div className="text-right tabular-nums">
                <p className="text-[18px] font-semibold text-zinc-950">
                  {subtotalFormatted.primary}
                  {hasMarketItems ? " +" : ""}
                </p>
                {subtotalFormatted.secondary && (
                  <p className="text-[12px] text-zinc-500">
                    {subtotalFormatted.secondary}
                    {hasMarketItems ? " +" : ""}
                  </p>
                )}
              </div>
            </div>

            {hasMarketItems && (
              <p
                lang={locale}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-[12px] leading-relaxed text-zinc-600"
              >
                {t.shortlistMarketNote}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                {t.shortlistClearAll}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="km-btn flex-1 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-90"
              >
                {t.done}
              </button>
            </div>
          </div>
        )}
      </div>
    </NativeDialog>
  );
}
