"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, UtensilsCrossed, Zap } from "lucide-react";
import { NativeSwitch } from "@/components/ui/NativeSwitch";
import { convertKhrToUsd, convertUsdToKhr } from "@/lib/currency";
import { isFreshSeafoodCategory, resolveLocalized } from "@/lib/i18n";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import type {
  Locale,
  PricingType,
  SerializedCategory,
  SerializedMenuItem,
  SerializedTenant,
  WeightUnit,
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

type QuickFilter = "ALL" | "FRESH_KG" | "SOLD_OUT";

interface DualDraft {
  khr: string;
  usd: string;
}

/**
 * Fast daily stock & pricing sheet supporting linked KHR (៛) and USD ($) inputs.
 * Cooked items use fixed pricing automatically; Fresh Seafood items are priced per kg.
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
  const [priceDrafts, setPriceDrafts] = useState<Record<string, DualDraft>>({});
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

  const flatItems = useMemo(() => {
    const scopedCats =
      selectedCategoryId === "ALL"
        ? categories
        : categories.filter((cat) => cat.id === selectedCategoryId);
    return scopedCats.flatMap((cat) => {
      const catIsFresh = isFreshSeafoodCategory(cat);
      const categoryName = resolveLocalized(
        locale,
        cat.nameKm,
        cat.nameEn,
        cat.name
      );
      return cat.items.map((item) => ({
        ...item,
        categoryName,
        isFreshPerKg: catIsFresh || item.pricingType === "WEIGHT_BASED",
      }));
    });
  }, [categories, selectedCategoryId, locale]);

  const counts = useMemo(() => {
    let freshKg = 0;
    let soldOut = 0;
    for (const item of flatItems) {
      if (item.isFreshPerKg) freshKg++;
      if (!item.isAvailable) soldOut++;
    }
    return {
      all: flatItems.length,
      freshKg,
      soldOut,
    };
  }, [flatItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flatItems.filter((item) => {
      if (filter === "FRESH_KG" && !item.isFreshPerKg) return false;
      if (filter === "SOLD_OUT" && item.isAvailable) return false;
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
      weightUnit: WeightUnit | null;
      marketPriceMin: number | null;
      marketPriceMax: number | null;
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

  const schedulePriceSave = (
    item: SerializedMenuItem & { isFreshPerKg: boolean },
    nextPrimaryPrice: number
  ) => {
    const existingTimer = timersRef.current.get(item.id);
    if (existingTimer) clearTimeout(existingTimer);

    const nextPricingType: PricingType = item.isFreshPerKg
      ? "WEIGHT_BASED"
      : "FIXED";
    const nextWeightUnit: WeightUnit | null = item.isFreshPerKg
      ? "PER_KG"
      : null;

    onCategoriesChange(
      categoriesRef.current.map((cat) =>
        cat.id === item.categoryId
          ? {
              ...cat,
              items: cat.items.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      price: nextPrimaryPrice,
                      pricingType: nextPricingType,
                      weightUnit: nextWeightUnit,
                    }
                  : i
              ),
            }
          : cat
      )
    );

    const timer = setTimeout(() => {
      timersRef.current.delete(item.id);
      void patchItem(
        item,
        {
          price: nextPrimaryPrice,
          pricingType: nextPricingType,
          weightUnit: nextWeightUnit,
          marketPriceMin: null,
          marketPriceMax: null,
        },
        (curr) => ({
          ...curr,
          price: nextPrimaryPrice,
          pricingType: nextPricingType,
          weightUnit: nextWeightUnit,
          marketPriceMin: null,
          marketPriceMax: null,
        })
      );
    }, 450);

    timersRef.current.set(item.id, timer);
  };

  const handleDualPriceChange = (
    item: SerializedMenuItem & { isFreshPerKg: boolean },
    editedCurrency: "KHR" | "USD",
    rawValue: string
  ) => {
    const parsed = Number(rawValue);
    const isValid =
      rawValue.trim() !== "" && !Number.isNaN(parsed) && parsed >= 0;

    if (editedCurrency === "KHR") {
      const nextUsd = isValid
        ? convertKhrToUsd(parsed, tenant.exchangeRate).toFixed(2)
        : "";
      setPriceDrafts((prev) => ({
        ...prev,
        [item.id]: { khr: rawValue, usd: nextUsd },
      }));
      if (!isValid) return;

      const nextPrimaryPrice =
        tenant.currency === "KHR"
          ? parsed
          : convertKhrToUsd(parsed, tenant.exchangeRate);
      schedulePriceSave(item, nextPrimaryPrice);
    } else {
      const nextKhr = isValid
        ? String(
            convertUsdToKhr(parsed, tenant.exchangeRate, tenant.khrRounding)
          )
        : "";
      setPriceDrafts((prev) => ({
        ...prev,
        [item.id]: { khr: nextKhr, usd: rawValue },
      }));
      if (!isValid) return;

      const nextPrimaryPrice =
        tenant.currency === "USD"
          ? parsed
          : convertUsdToKhr(parsed, tenant.exchangeRate, tenant.khrRounding);
      schedulePriceSave(item, nextPrimaryPrice);
    }
  };

  const kgShort = locale === "km" ? "/ គីឡូ" : "/ kg";

  return (
    <section
      lang={locale}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-subtle bg-brand-subtle text-zinc-900">
            <Zap className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              {t.quickTitle}
            </h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">{t.quickSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium tabular-nums">
          <span className="rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-1 text-zinc-700">
            {t.quickTotalCount(counts.all)}
          </span>
          <span className="rounded-md border border-brand-subtle bg-brand-subtle px-2 py-1 text-zinc-900">
            {t.quickMarketCount(counts.freshKg)}
          </span>
          <span className="rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-1 text-zinc-500">
            {t.quickSoldOutCount(counts.soldOut)}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2.5 border-b border-zinc-200 bg-[#FAFAFA] px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.quickSearchPlaceholder}
            aria-label={t.quickSearchPlaceholder}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-8.5 pr-3 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
          />
        </div>

        <div
          role="tablist"
          aria-label={t.colCategory}
          className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 text-[12px] sm:w-auto"
        >
          {(
            [
              { id: "ALL", label: c.all, count: counts.all },
              {
                id: "FRESH_KG",
                label: t.quickFilterLiveWeight,
                count: counts.freshKg,
              },
              { id: "SOLD_OUT", label: c.soldOut, count: counts.soldOut },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`km-pill inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  active
                    ? "bg-brand shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1 text-[10.5px] tabular-nums ${
                    active ? "bg-black/10" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Menu Control List */}
      {filteredItems.length === 0 ? (
        <div className="px-4 py-12 text-center text-[13px] text-zinc-500">
          {t.quickEmpty}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {filteredItems.map((item) => {
            const dishTitle = resolveLocalized(
              locale,
              item.nameKm,
              item.nameEn,
              item.name
            );
            const defaultKhr =
              tenant.currency === "KHR"
                ? String(Math.round(item.price))
                : String(
                    convertUsdToKhr(
                      item.price,
                      tenant.exchangeRate,
                      tenant.khrRounding
                    )
                  );
            const defaultUsd =
              tenant.currency === "USD"
                ? item.price.toFixed(2)
                : convertKhrToUsd(item.price, tenant.exchangeRate).toFixed(2);
            const draft = priceDrafts[item.id] ?? {
              khr: defaultKhr,
              usd: defaultUsd,
            };
            const saveState = savingIds[item.id];

            return (
              <li
                key={item.id}
                className={`flex flex-col gap-3 px-4 py-3.5 transition-colors lg:flex-row lg:items-center lg:justify-between ${
                  !item.isAvailable
                    ? "bg-zinc-50/80"
                    : "bg-white hover:bg-zinc-50/40"
                }`}
              >
                {/* Dish Identity + Thumbnail */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={dishTitle}
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                      className={`h-11 w-11 shrink-0 rounded-lg border border-zinc-200 object-cover ${
                        !item.isAvailable ? "opacity-50 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-[#FAFAFA] text-zinc-400">
                      <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`truncate text-[14px] font-semibold ${
                          item.isAvailable ? "text-zinc-950" : "text-zinc-400"
                        }`}
                      >
                        {dishTitle}
                      </span>
                      {saveState === "saved" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="h-2.5 w-2.5" strokeWidth={2.25} />
                          <span>{t.quickSaved}</span>
                        </span>
                      )}
                      {saveState === "saving" && (
                        <span className="text-[10.5px] font-medium text-zinc-400">
                          {t.quickSaving}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-zinc-500">
                      <span className="truncate">{item.categoryName}</span>
                      {item.isFreshPerKg && (
                        <>
                          <span className="text-zinc-300">·</span>
                          <span className="rounded bg-brand-subtle px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-900">
                            {kgShort}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Responsive Controls: Linked KHR + USD Inputs + Stock Switch */}
                <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
                  <div className="grid flex-1 grid-cols-2 gap-1.5 sm:flex sm:flex-initial sm:items-center">
                    <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-white focus-within:border-brand">
                      <span className="pl-2.5 pr-1 text-[12px] font-semibold text-zinc-500">
                        ៛
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="500"
                        min="0"
                        value={draft.khr}
                        onChange={(e) =>
                          handleDualPriceChange(item, "KHR", e.target.value)
                        }
                        aria-label={`${dishTitle} (KHR)`}
                        className="h-full w-full min-w-0 bg-transparent pr-2.5 text-right text-[13.5px] font-semibold tabular-nums text-zinc-950 focus:outline-none sm:w-24"
                      />
                    </div>

                    <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-white focus-within:border-brand">
                      <span className="pl-2.5 pr-1 text-[12px] font-semibold text-zinc-500">
                        $
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        min="0"
                        value={draft.usd}
                        onChange={(e) =>
                          handleDualPriceChange(item, "USD", e.target.value)
                        }
                        aria-label={`${dishTitle} (USD)`}
                        className="h-full w-full min-w-0 bg-transparent pr-2.5 text-right text-[13.5px] font-semibold tabular-nums text-zinc-950 focus:outline-none sm:w-20"
                      />
                    </div>
                  </div>

                  {/* 1-Tap Stock Switch */}
                  <div className="flex shrink-0 items-center gap-2 border-l border-zinc-200 pl-2.5">
                    <span
                      className={`hidden text-[12px] font-medium md:inline ${
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
