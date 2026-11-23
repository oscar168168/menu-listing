"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, X } from "lucide-react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import {
  formatDualPrice,
  formatMarketRange,
  formatSurcharge,
  type DualCurrencyConfig,
} from "@/lib/currency";
import {
  isHighlightedTag,
  localizeTag,
  resolveLocalized,
  UI_COPY,
} from "@/lib/i18n";
import type {
  CookingStyleOption,
  ItemVariant,
  Locale,
  SerializedMenuItem,
  SerializedTenant,
} from "@/types/menu";

interface ItemDetailSheetProps {
  item: SerializedMenuItem | null;
  tenant: SerializedTenant;
  locale: Locale;
  enableCart: boolean;
  onClose: () => void;
  onAddToShortlist: (selection: {
    item: SerializedMenuItem;
    variant?: ItemVariant;
    cookingStyle?: CookingStyleOption;
    quantity: number;
  }) => void;
}

function ItemDetailBody({
  item,
  tenant,
  locale,
  enableCart,
  onClose,
  onAddToShortlist,
}: {
  item: SerializedMenuItem;
  tenant: SerializedTenant;
  locale: Locale;
  enableCart: boolean;
  onClose: () => void;
  onAddToShortlist: ItemDetailSheetProps["onAddToShortlist"];
}) {
  const t = UI_COPY[locale];
  const currencyConfig: DualCurrencyConfig = {
    primaryCurrency: tenant.currency,
    showDualCurrency: tenant.showDualCurrency,
    exchangeRate: tenant.exchangeRate,
    khrRounding: tenant.khrRounding,
  };

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    item.cookingStyles[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = item.variants[selectedVariantIdx];
  const selectedStyle = item.cookingStyles.find(
    (s) => s.id === selectedStyleId
  );

  const primaryTitle = resolveLocalized(
    locale,
    item.nameKm,
    item.nameEn,
    item.name
  );
  const secondaryTitle =
    locale === "km"
      ? item.nameEn && item.nameEn !== primaryTitle
        ? item.nameEn
        : null
      : item.nameKm && item.nameKm !== primaryTitle
        ? item.nameKm
        : null;

  const description = resolveLocalized(
    locale,
    item.descriptionKm,
    item.descriptionEn,
    item.description
  );

  const baseUnitPrice = selectedVariant ? selectedVariant.price : item.price;
  const styleSurcharge = selectedStyle?.surcharge ?? 0;
  const totalUnitPrice = baseUnitPrice + styleSurcharge;

  const displayPrice =
    item.pricingType === "MARKET_PRICE"
      ? null
      : formatDualPrice(baseUnitPrice, currencyConfig, {
          weightUnit:
            item.pricingType === "WEIGHT_BASED" ? item.weightUnit : null,
          locale,
        });

  const marketRange =
    item.pricingType === "MARKET_PRICE"
      ? formatMarketRange(
          item.marketPriceMin,
          item.marketPriceMax,
          currencyConfig,
          { weightUnit: item.weightUnit, locale }
        )
      : null;

  const buttonTotalFormatted =
    item.pricingType === "MARKET_PRICE"
      ? null
      : formatDualPrice(totalUnitPrice * quantity, currencyConfig, { locale });

  const handleAdd = () => {
    onAddToShortlist({
      item,
      variant: selectedVariant,
      cookingStyle: selectedStyle,
      quantity,
    });
    onClose();
  };

  return (
    <div lang={locale} className="pb-6">
      {item.imageUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-zinc-200 bg-zinc-100">
          <Image
            src={item.imageUrl}
            alt={primaryTitle}
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            unoptimized={item.imageUrl.startsWith("/api/media/")}
            fetchPriority="low"
            className={`object-cover ${
              !item.isAvailable ? "opacity-50 grayscale-[35%]" : ""
            }`}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item details"
            className="absolute right-3.5 top-3.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-900 transition-colors hover:bg-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end px-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="px-5 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold text-zinc-950">
              {primaryTitle}
            </h2>
            {secondaryTitle && (
              <p
                lang={locale === "km" ? "en" : "km"}
                className="mt-0.5 text-[13px] text-zinc-500"
              >
                {secondaryTitle}
              </p>
            )}
          </div>
          {!item.isAvailable && (
            <span className="km-badge shrink-0 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
              {t.soldOut}
            </span>
          )}
        </div>

        {/* Price / Market Price Display */}
        <div className="mt-2.5">
          {item.pricingType === "MARKET_PRICE" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="km-badge inline-flex rounded-md border border-brand-subtle bg-brand-subtle px-2.5 py-0.5 text-[12px] font-semibold text-zinc-950">
                {t.marketPrice}
              </span>
              {marketRange && (
                <span className="text-[13px] tabular-nums text-zinc-600">
                  {t.estRangePrefix} {marketRange.primary}
                  {marketRange.secondary && (
                    <span className="ml-1.5 text-[12px] text-zinc-400">
                      / {marketRange.secondary}
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : (
            displayPrice &&
            item.variants.length === 0 && (
              <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                <span className="text-[16px] font-semibold text-zinc-950">
                  {displayPrice.primary}
                </span>
                {displayPrice.secondary && (
                  <span className="text-[13px] text-zinc-500">
                    / {displayPrice.secondary}
                  </span>
                )}
              </div>
            )
          )}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => {
              const highlight = isHighlightedTag(tag);
              return (
                <span
                  key={tag}
                  className={
                    highlight
                      ? "km-badge rounded-md border border-brand-subtle bg-brand-subtle px-2 py-0.5 text-[11px] font-medium text-zinc-900"
                      : "km-badge rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                  }
                >
                  {localizeTag(tag, locale)}
                </span>
              );
            })}
          </div>
        )}

        {description && (
          <p className="mt-3.5 text-[14px] text-zinc-600">{description}</p>
        )}

        {/* Portion / Variants */}
        {item.variants.length > 0 && (
          <div className="mt-5 border-t border-zinc-200 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
              {t.optionsAndPricing}
            </h3>
            {enableCart ? (
              <div className="mt-2.5 space-y-1.5">
                {item.variants.map((variant, idx) => {
                  const selected = idx === selectedVariantIdx;
                  const formatted = formatDualPrice(
                    variant.price,
                    currencyConfig,
                    { locale }
                  );
                  const label = resolveLocalized(
                    locale,
                    variant.labelKm,
                    variant.label,
                    variant.label
                  );
                  return (
                    <button
                      key={`${variant.label}-${idx}`}
                      type="button"
                      onClick={() => setSelectedVariantIdx(idx)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-brand bg-brand-subtle"
                          : "border-zinc-200 bg-white hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-brand bg-brand"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {selected && (
                            <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                          )}
                        </span>
                        <span className="text-[14px] font-medium text-zinc-900">
                          {label}
                        </span>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="text-[14px] font-medium text-zinc-950">
                          {formatted.primary}
                        </span>
                        {formatted.secondary && (
                          <span className="ml-1.5 text-[12px] text-zinc-500">
                            {formatted.secondary}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ul className="mt-2.5 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-[#FAFAFA]">
                {item.variants.map((variant, idx) => {
                  const formatted = formatDualPrice(
                    variant.price,
                    currencyConfig,
                    { locale }
                  );
                  const label = resolveLocalized(
                    locale,
                    variant.labelKm,
                    variant.label,
                    variant.label
                  );
                  return (
                    <li
                      key={`${variant.label}-${idx}`}
                      className="flex items-center justify-between px-3.5 py-2.5 text-[14px]"
                    >
                      <span className="font-medium text-zinc-800">{label}</span>
                      <span className="tabular-nums">
                        <strong className="font-medium text-zinc-950">
                          {formatted.primary}
                        </strong>
                        {formatted.secondary && (
                          <span className="ml-1.5 text-[12px] text-zinc-500">
                            {formatted.secondary}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Cooking Style / Preparation Options */}
        {item.cookingStyles.length > 0 && (
          <div className="mt-5 border-t border-zinc-200 pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                {t.cookingStyleTitle}
              </h3>
              {enableCart && (
                <span className="text-[11px] text-zinc-400">
                  {t.cookingStyleHint}
                </span>
              )}
            </div>
            {enableCart ? (
              <div className="mt-2.5 space-y-1.5">
                {item.cookingStyles.map((style) => {
                  const selected = style.id === selectedStyleId;
                  const label = resolveLocalized(
                    locale,
                    style.nameKm,
                    style.nameEn
                  );
                  const subLabel =
                    locale === "km"
                      ? style.nameEn && style.nameEn !== label
                        ? style.nameEn
                        : null
                      : style.nameKm && style.nameKm !== label
                        ? style.nameKm
                        : null;
                  const surchargeFormatted =
                    style.surcharge > 0
                      ? formatSurcharge(style.surcharge, currencyConfig)
                      : null;

                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyleId(style.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-brand bg-brand-subtle"
                          : "border-zinc-200 bg-white hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-brand bg-brand"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {selected && (
                            <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[14px] font-medium text-zinc-900">
                            {label}
                          </span>
                          {subLabel && (
                            <span
                              lang={locale === "km" ? "en" : "km"}
                              className="block text-[11px] text-zinc-500"
                            >
                              {subLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[12px] font-medium tabular-nums text-zinc-600">
                        {surchargeFormatted
                          ? surchargeFormatted.primary
                          : t.noExtraCharge}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ul className="mt-2.5 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-[#FAFAFA]">
                {item.cookingStyles.map((style) => {
                  const label = resolveLocalized(
                    locale,
                    style.nameKm,
                    style.nameEn
                  );
                  const subLabel =
                    locale === "km"
                      ? style.nameEn && style.nameEn !== label
                        ? style.nameEn
                        : null
                      : style.nameKm && style.nameKm !== label
                        ? style.nameKm
                        : null;
                  const surchargeFormatted =
                    style.surcharge > 0
                      ? formatSurcharge(style.surcharge, currencyConfig)
                      : null;
                  return (
                    <li
                      key={style.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="block text-[14px] font-medium text-zinc-900">
                          {label}
                        </span>
                        {subLabel && (
                          <span
                            lang={locale === "km" ? "en" : "km"}
                            className="block text-[11px] text-zinc-500"
                          >
                            {subLabel}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[12px] font-medium tabular-nums text-zinc-600">
                        {surchargeFormatted
                          ? surchargeFormatted.primary
                          : t.noExtraCharge}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Footer Action: Add to Cart (Mode 1) OR Done (Mode 2 Listing Only) */}
        <div className="mt-6 flex items-center gap-3 border-t border-zinc-200 pt-4">
          {enableCart && item.isAvailable ? (
            <>
              <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-[#FAFAFA]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 hover:text-zinc-950"
                >
                  <Minus className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <span className="w-8 text-center text-[14px] font-semibold tabular-nums text-zinc-950">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  aria-label="Increase quantity"
                  className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 hover:text-zinc-950"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                className="km-btn flex flex-1 items-center justify-between rounded-lg bg-brand px-4 py-2.5 text-[14px] font-medium transition-opacity hover:opacity-90"
              >
                <span>{t.addToShortlist}</span>
                {buttonTotalFormatted && (
                  <span className="tabular-nums opacity-90">
                    {buttonTotalFormatted.primary}
                  </span>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="km-btn w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-[14px] font-medium text-zinc-900 hover:bg-zinc-200/80"
            >
              {!item.isAvailable ? `${t.soldOut} · ${t.done}` : t.done}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ItemDetailSheet({
  item,
  tenant,
  locale,
  enableCart,
  onClose,
  onAddToShortlist,
}: ItemDetailSheetProps) {
  return (
    <NativeDialog
      open={Boolean(item)}
      onClose={onClose}
      variant="sheet"
      lightDismiss={true}
      hideHeader={true}
      ariaLabel={
        item
          ? `${resolveLocalized(locale, item.nameKm, item.nameEn, item.name)} details`
          : "Menu item details"
      }
    >
      {item && (
        <ItemDetailBody
          key={item.id}
          item={item}
          tenant={tenant}
          locale={locale}
          enableCart={enableCart}
          onClose={onClose}
          onAddToShortlist={onAddToShortlist}
        />
      )}
    </NativeDialog>
  );
}
