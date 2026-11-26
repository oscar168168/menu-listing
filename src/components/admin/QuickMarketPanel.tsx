"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, Zap } from "lucide-react";
import { NativeSwitch } from "@/components/ui/NativeSwitch";
import { formatDualPrice, type DualCurrencyConfig } from "@/lib/currency";
import { formatWeightUnit, resolveLocalized } from "@/lib/i18n";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import type {
  Locale,
  PricingType,
  SerializedCategory,
  SerializedMenuItem,
  SerializedTenant,
} from "@/types/menu";

interface QuickMarketPanelProps {
  locale: Locale;
  tenant: SerializedTenant;
  categories: SerializedCategory[];
  selectedCategoryId?: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onCategoriesChange: (next: SerializedCategory[]) => void;
  onNotify: (text: string, tone?: "neutral" | "error") => void;
}

type QuickFilter = "ALL" | "SEAFOOD_WEIGHT" | "MARKET" | "SOLD_OUT";

/**
 * "Daily Market Update" Fast Mode for morning seafood price & live tank inventory updates.
 */
export function QuickMarketPanel({
  locale,
  tenant,
  categories,
  selectedCategoryId = "ALL",
  searchQuery: externalSearch,
  onSearchChange,
  onCategoriesChange,
  onNotify,
}: QuickMarketPanelProps) {
  const t = PORTAL_COPY[locale].admin;
  const c = PORTAL_COPY[locale].common;

  const [localSearch, setLocalSearch] = useState("");
  const searchQuery = externalSearch ?? localSearch;
  const setSearchQuery = onSearchChange ?? setLocalSearch;
  const [filter, setFilter] = useState<QuickFilter>("ALL");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<
    Record<string, "saving" | "saved">
  >({});
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const currencyConfig: DualCurrencyConfig = useMemo(
    () => ({
      primaryCurrency: tenant.currency,
      showDualCurrency: tenant.showDualCurrency,
      exchangeRate: tenant.exchangeRate,
      khrRounding: tenant.khrRounding,
    }),
    [
      tenant.currency,
      tenant.showDualCurrency,
      tenant.exchangeRate,
      tenant.khrRounding,
    ]
  );

  const flatItems = useMemo(() => {
    const scopedCats =
      selectedCategoryId === "ALL"
        ? categories
        : categories.filter((cat) => cat.id === selectedCategoryId);
    return scopedCats.flatMap((cat) =>
      cat.items.map((item) => ({
        ...item,
        categoryName: resolveLocalized(
          locale,
          cat.nameKm,
          cat.nameEn,
          cat.name
        ),
        categoryNameKm: cat.nameKm,
        categoryNameEn: cat.nameEn,
      }))
    );
  }, [categories, selectedCategoryId, locale]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flatItems.filter((item) => {
      if (
        filter === "SEAFOOD_WEIGHT" &&
        item.pricingType !== "WEIGHT_BASED" &&
        !item.tags.includes("Live Tank")
      ) {
        return false;
      }
      if (filter === "MARKET" && item.pricingType !== "MARKET_PRICE") {
        return false;
      }
      if (filter === "SOLD_OUT" && item.isAvailable) {
        return false;
      }
      if (!q) return true;
      return (
        item.nameEn.toLowerCase().includes(q) ||
        item.nameKm.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q)
      );
    });
  }, [flatItems, filter, searchQuery]);

  const markStatus = (id: string, state: "saving" | "saved") => {
    setSavingIds((prev) => ({ ...prev, [id]: state }));
    if (state === "saved") {
      setTimeout(() => {
        setSavingIds((prev) => {
          if (prev[id] !== "saved") return prev;
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }, 1500);
    }
  };

  const patchItem = async (
    item: SerializedMenuItem,
    patch: Partial<{
      isAvailable: boolean;
      price: number;
      pricingType: PricingType;
    }>,
    optimisticUpdate: (curr: SerializedMenuItem) => SerializedMenuItem
  ) => {
    const previous = categoriesRef.current;
    onCategoriesChange(
      previous.map((cat) =>
        cat.id === item.categoryId
          ? {
              ...cat,
              items: cat.items.map((i) =>
                i.id === item.id ? optimisticUpdate(i) : i
              ),
            }
          : cat
      )
    );
    markStatus(item.id, "saving");

    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as {
        item?: SerializedMenuItem;
        error?: string;
      };
      if (!res.ok || !json.item) {
        throw new Error(json.error ?? t.toastQuickError);
      }
      const persisted = json.item;
      onCategoriesChange(
        categoriesRef.current.map((cat) =>
          cat.id === persisted.categoryId
            ? {
                ...cat,
                items: cat.items.map((i) =>
                  i.id === persisted.id ? persisted : i
                ),
              }
            : cat
        )
      );
      markStatus(item.id, "saved");
    } catch {
      onCategoriesChange(previous);
      onNotify(t.toastQuickError, "error");
    }
  };

  const handleDebouncedPriceChange = (
    item: SerializedMenuItem,
    rawValue: string
  ) => {
    setPriceDrafts((prev) => ({ ...prev, [item.id]: rawValue }));

    const existingTimer = timersRef.current.get(item.id);
    if (existingTimer) clearTimeout(existingTimer);

    const parsed = Number(rawValue);
    if (rawValue.trim() === "" || Number.isNaN(parsed) || parsed < 0) return;

    onCategoriesChange(
      categoriesRef.current.map((cat) =>
        cat.id === item.categoryId
          ? {
              ...cat,
              items: cat.items.map((i) =>
                i.id === item.id ? { ...i, price: parsed } : i
              ),
            }
          : cat
      )
    );

    const timer = setTimeout(() => {
      timersRef.current.delete(item.id);
      void patchItem(item, { price: parsed }, (curr) => ({
        ...curr,
        price: parsed,
      }));
    }, 450);

    timersRef.current.set(item.id, timer);
  };

  const handleToggleMarketPrice = (item: SerializedMenuItem) => {
    const nextType: PricingType =
      item.pricingType === "MARKET_PRICE"
        ? item.weightUnit
          ? "WEIGHT_BASED"
          : "FIXED"
        : "MARKET_PRICE";

    void patchItem(item, { pricingType: nextType }, (curr) => ({
      ...curr,
      pricingType: nextType,
    }));
    const itemName = resolveLocalized(locale, item.nameKm, item.nameEn, item.name);
    onNotify(
      nextType === "MARKET_PRICE"
        ? t.toastQuickMarket(itemName)
        : t.toastQuickListed(itemName)
    );
  };

  const soldOutCount = flatItems.filter((i) => !i.isAvailable).length;
  const marketCount = flatItems.filter(
    (i) => i.pricingType === "MARKET_PRICE"
  ).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-brand-subtle bg-brand-subtle text-zinc-900">
            <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              {t.quickTitle}
            </h2>
            <p className="text-[12px] text-zinc-500">{t.quickSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] tabular-nums text-zinc-500">
          <span className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5">
            {t.quickMarketCount(marketCount)}
          </span>
          <span className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5">
            {t.quickSoldOutCount(soldOutCount)}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-[#FAFAFA] px-4 py-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.quickSearchPlaceholder}
            aria-label={t.quickSearchPlaceholder}
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-md border border-zinc-200 bg-white p-0.5 text-[12px]">
          {(
            [
              { id: "ALL", label: c.all },
              { id: "SEAFOOD_WEIGHT", label: t.quickFilterLiveWeight },
              { id: "MARKET", label: c.marketPrice },
              { id: "SOLD_OUT", label: c.soldOut },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                filter === tab.id
                  ? "bg-brand"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dense Touch-Friendly Market Sheet */}
      {filteredItems.length === 0 ? (
        <div className="px-4 py-12 text-center text-[13px] text-zinc-500">
          {t.quickEmpty}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {filteredItems.map((item) => {
            const isMarket = item.pricingType === "MARKET_PRICE";
            const dishTitle = resolveLocalized(
              locale,
              item.nameKm,
              item.nameEn,
              item.name
            );
            const draftVal =
              priceDrafts[item.id] ??
              (tenant.currency === "KHR"
                ? String(Math.round(item.price))
                : item.price.toFixed(2));
            const numericPreview = Number(draftVal);
            const dualPreview =
              !isMarket && !Number.isNaN(numericPreview)
                ? formatDualPrice(numericPreview, currencyConfig, { locale })
                : null;
            const saveState = savingIds[item.id];
            const unitLabel = item.weightUnit
              ? formatWeightUnit(item.weightUnit, locale)
              : "";

            return (
              <li
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors ${
                  !item.isAvailable ? "bg-[#FAFAFA]" : "bg-white"
                }`}
              >
                {/* Dish Identity */}
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-[14px] font-semibold ${
                        item.isAvailable ? "text-zinc-950" : "text-zinc-400"
                      }`}
                    >
                      {dishTitle}
                    </span>
                    {saveState === "saved" && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                        <Check className="h-2.5 w-2.5" strokeWidth={2} />
                        <span>{t.quickSaved}</span>
                      </span>
                    )}
                    {saveState === "saving" && (
                      <span className="text-[10px] text-zinc-400">
                        {t.quickSaving}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[12px] text-zinc-500">
                    {item.categoryName}
                    {unitLabel ? (
                      <span className="ml-1.5 text-[11px] text-zinc-400">
                        ({unitLabel})
                      </span>
                    ) : null}
                  </p>
                </div>

                {/* Inline Price / Market Price Toggle + Stock Toggle */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {isMarket ? (
                    <div className="flex h-9 w-[152px] items-center justify-center rounded-md border border-brand-subtle bg-brand-subtle px-2.5 text-[12px] font-medium text-zinc-900">
                      <span>{c.marketPrice}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center rounded-md border border-zinc-200 bg-white focus-within:border-brand">
                        <span className="pl-2.5 pr-1 text-[12px] font-medium text-zinc-500">
                          {tenant.currency === "KHR" ? "៛" : "$"}
                        </span>
                        <input
                          type="number"
                          step={tenant.currency === "KHR" ? "100" : "0.25"}
                          min="0"
                          value={draftVal}
                          onChange={(e) =>
                            handleDebouncedPriceChange(item, e.target.value)
                          }
                          aria-label={dishTitle}
                          className="h-9 w-24 bg-transparent pr-2 text-right text-[14px] font-medium tabular-nums text-zinc-950 focus:outline-none"
                        />
                        {unitLabel && (
                          <span className="border-l border-zinc-100 px-1.5 text-[10px] text-zinc-400">
                            {unitLabel}
                          </span>
                        )}
                      </div>
                      {dualPreview?.secondary && (
                        <span className="mt-0.5 text-[10px] tabular-nums text-zinc-400">
                          ≈ {dualPreview.secondary}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 1-Tap Market Price Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleMarketPrice(item)}
                    aria-pressed={isMarket}
                    className={`h-9 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
                      isMarket
                        ? "border-brand bg-brand"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {isMarket ? t.quickSetPrice : t.quickMarketBtn}
                  </button>

                  {/* 1-Tap Stock Toggle */}
                  <div className="flex items-center gap-2 border-l border-zinc-200 pl-2.5">
                    <span
                      className={`w-14 text-right text-[12px] font-medium ${
                        item.isAvailable ? "text-zinc-800" : "text-zinc-400"
                      }`}
                    >
                      {item.isAvailable ? c.inStock : c.soldOut}
                    </span>
                    <NativeSwitch
                      checked={item.isAvailable}
                      onChange={(checked) => {
                        void patchItem(
                          item,
                          { isAvailable: checked },
                          (curr) => ({ ...curr, isAvailable: checked })
                        );
                        onNotify(
                          checked
                            ? t.toastItemInStock(dishTitle)
                            : t.toastItemSoldOut(dishTitle)
                        );
                      }}
                      label={dishTitle}
                      srOnlyLabel
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
