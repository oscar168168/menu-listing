"use client";

import { useMemo, useState } from "react";
import {
  ChevronsRight,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { NativeSwitch } from "@/components/ui/NativeSwitch";
import { NativeSelect } from "@/components/ui/NativeSelect";
import {
  formatDualPrice,
  formatMarketRange,
  formatSurcharge,
  type DualCurrencyConfig,
} from "@/lib/currency";
import {
  formatWeightUnit,
  localizeTag,
  PRESET_SEAFOOD_TAGS,
  resolveLocalized,
} from "@/lib/i18n";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import type {
  Locale,
  PricingType,
  SerializedCategory,
  SerializedMenuItem,
  SerializedTenant,
} from "@/types/menu";

interface MenuManagerProps {
  locale: Locale;
  tenant: SerializedTenant;
  categories: SerializedCategory[];
  selectedCategoryId: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddDish: () => void;
  onEditDish: (item: SerializedMenuItem) => void;
  onDeleteDish: (item: SerializedMenuItem) => void;
  onToggleAvailability: (
    item: SerializedMenuItem,
    nextAvailable: boolean
  ) => void;
}

type StatusTab = "ALL" | "ACTIVE" | "SOLD_OUT" | "MARKET_PRICE";
type ViewMode = "grid" | "table";

export function MenuManager({
  locale,
  tenant,
  categories,
  selectedCategoryId,
  searchQuery,
  onSearchChange,
  onAddDish,
  onEditDish,
  onDeleteDish,
  onToggleAvailability,
}: MenuManagerProps) {
  const t = PORTAL_COPY[locale].admin;
  const c = PORTAL_COPY[locale].common;

  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [pricingFilter, setPricingFilter] = useState<"ALL" | PricingType>(
    "ALL"
  );
  const [tagFilter, setTagFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const categoryScopedItems = useMemo(() => {
    const cats =
      selectedCategoryId === "ALL"
        ? categories
        : categories.filter((cat) => cat.id === selectedCategoryId);
    return cats.flatMap((cat) =>
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

  const counts = useMemo(() => {
    let active = 0;
    let soldOut = 0;
    let market = 0;
    for (const item of categoryScopedItems) {
      if (item.isAvailable) active++;
      else soldOut++;
      if (item.pricingType === "MARKET_PRICE") market++;
    }
    return {
      all: categoryScopedItems.length,
      active,
      soldOut,
      market,
    };
  }, [categoryScopedItems]);

  const availableTags = useMemo(() => {
    const set = new Set<string>(PRESET_SEAFOOD_TAGS);
    for (const item of categoryScopedItems) {
      for (const tag of item.tags) set.add(tag);
    }
    return Array.from(set);
  }, [categoryScopedItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categoryScopedItems.filter((item) => {
      if (statusTab === "ACTIVE" && !item.isAvailable) return false;
      if (statusTab === "SOLD_OUT" && item.isAvailable) return false;
      if (statusTab === "MARKET_PRICE" && item.pricingType !== "MARKET_PRICE") {
        return false;
      }
      if (pricingFilter !== "ALL" && item.pricingType !== pricingFilter) {
        return false;
      }
      if (tagFilter !== "ALL" && !item.tags.includes(tagFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        item.nameEn.toLowerCase().includes(q) ||
        item.nameKm.toLowerCase().includes(q) ||
        item.descriptionEn.toLowerCase().includes(q) ||
        item.descriptionKm.toLowerCase().includes(q) ||
        item.tags.some(
          (tag) =>
            tag.toLowerCase().includes(q) ||
            localizeTag(tag, "km").toLowerCase().includes(q)
        ) ||
        item.categoryName.toLowerCase().includes(q)
      );
    });
  }, [categoryScopedItems, statusTab, pricingFilter, tagFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    pricingFilter !== "ALL" ||
    tagFilter !== "ALL" ||
    statusTab !== "ALL";

  const statusTabs: Array<{ id: StatusTab; label: string; count: number }> = [
    { id: "ALL", label: c.all, count: counts.all },
    { id: "ACTIVE", label: c.inStock, count: counts.active },
    { id: "SOLD_OUT", label: c.soldOut, count: counts.soldOut },
    { id: "MARKET_PRICE", label: c.marketPrice, count: counts.market },
  ];

  const selectedCatLabel = selectedCategory
    ? resolveLocalized(
        locale,
        selectedCategory.nameKm,
        selectedCategory.nameEn,
        selectedCategory.name
      )
    : undefined;

  return (
    <div className="space-y-4">
      {/* Page Title & Primary CTA Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-zinc-950">
            {selectedCatLabel ?? t.allDishesHeading}
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            {t.showingItems(
              filteredItems.length,
              categoryScopedItems.length,
              selectedCatLabel
            )}
          </p>
        </div>

        <button
          type="button"
          disabled={categories.length === 0}
          onClick={onAddDish}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          <span>{t.addDishBtn}</span>
        </button>
      </div>

      {/* Status Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200">
        <div
          role="tablist"
          aria-label={t.colStock}
          className="flex items-center gap-1 -mb-px"
        >
          {statusTabs.map((tab) => {
            const active = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setStatusTab(tab.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-brand text-zinc-950"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] tabular-nums ${
                    active
                      ? "bg-brand-subtle text-zinc-900"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid / Compact Table View Switcher */}
        <div className="flex items-center gap-1 pb-1.5">
          <div
            role="group"
            aria-label={t.gridViewLabel}
            className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              title={t.gridViewLabel}
              aria-label={t.gridViewLabel}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              title={t.tableViewLabel}
              aria-label={t.tableViewLabel}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              <List className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.filterDishesPlaceholder}
            aria-label={t.filterDishesPlaceholder}
            className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
          />
        </div>

        <NativeSelect
          ariaLabel={t.pricingFilterAll}
          value={pricingFilter}
          onChange={(v) => setPricingFilter(v as "ALL" | PricingType)}
          options={[
            { value: "ALL", label: t.pricingFilterAll },
            { value: "FIXED", label: t.pricingFixed },
            { value: "WEIGHT_BASED", label: t.pricingWeight },
            { value: "MARKET_PRICE", label: t.pricingMarket },
          ]}
        />

        <NativeSelect
          ariaLabel={t.tagFilterAll}
          value={tagFilter}
          onChange={setTagFilter}
          options={[
            { value: "ALL", label: t.tagFilterAll },
            ...availableTags.map((tag) => ({
              value: tag,
              label: localizeTag(tag, locale),
            })),
          ]}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              setStatusTab("ALL");
              setPricingFilter("ALL");
              setTagFilter("ALL");
            }}
            className="text-[12px] font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-950"
          >
            {c.resetFilters}
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-[14px] font-medium text-zinc-900">
            {categoryScopedItems.length === 0
              ? t.emptyCategoryTitle
              : t.emptyFilteredTitle}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {categoryScopedItems.length === 0
              ? t.emptyCategoryBody
              : t.emptyFilteredBody}
          </p>
          {categoryScopedItems.length === 0 && categories.length > 0 && (
            <button
              type="button"
              onClick={onAddDish}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-medium"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>{t.addDishBtn}</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="admin-catalog-grid-container">
          <div className="admin-catalog-grid">
            {filteredItems.map((item) => {
              const dishTitle = resolveLocalized(
                locale,
                item.nameKm,
                item.nameEn,
                item.name
              );
              const dualPrice =
                item.pricingType === "MARKET_PRICE"
                  ? null
                  : formatDualPrice(item.price, currencyConfig, {
                      locale,
                      localeOnly: true,
                      weightUnit:
                        item.pricingType === "WEIGHT_BASED"
                          ? item.weightUnit
                          : null,
                    });
              const marketRange =
                item.pricingType === "MARKET_PRICE"
                  ? formatMarketRange(
                      item.marketPriceMin,
                      item.marketPriceMax,
                      currencyConfig,
                      { weightUnit: item.weightUnit, locale, localeOnly: true }
                    )
                  : null;

              return (
                <article
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 ${
                    !item.isAvailable ? "bg-[#FAFAFA]" : ""
                  }`}
                >
                  <div>
                    {/* Top Row: Thumbnail + Name + Edit/Delete */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={dishTitle}
                            width={44}
                            height={44}
                            loading="lazy"
                            decoding="async"
                            className={`h-11 w-11 shrink-0 rounded-lg border border-zinc-200 object-cover ${
                              !item.isAvailable ? "opacity-50" : ""
                            }`}
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-[#FAFAFA] text-zinc-400">
                            <UtensilsCrossed
                              className="h-4 w-4"
                              strokeWidth={1.5}
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`line-clamp-2 text-[14px] font-semibold ${
                              item.isAvailable
                                ? "text-zinc-950"
                                : "text-zinc-500"
                            }`}
                          >
                            {dishTitle}
                          </h3>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEditDish(item)}
                          aria-label={`Edit ${dishTitle}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDish(item)}
                          aria-label={`Delete ${dishTitle}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Category & Tag Pills */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1">
                      <span className="rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {item.categoryName}
                      </span>
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600"
                        >
                          {localizeTag(tag, locale)}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-[11px] text-zinc-400">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Structured Pricing / Variants / Cooking Styles Table */}
                    <div className="mt-3.5 border-t border-zinc-100 pt-3">
                      {item.variants.length > 0 ? (
                        <div className="space-y-1.5 text-[12px]">
                          {item.variants.slice(0, 3).map((variant, idx) => {
                            const vf = formatDualPrice(
                              variant.price,
                              currencyConfig,
                              { locale, localeOnly: true }
                            );
                            return (
                              <div
                                key={`${variant.label}-${idx}`}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-zinc-600">
                                  {resolveLocalized(
                                    locale,
                                    variant.labelKm,
                                    variant.label
                                  )}
                                </span>
                                <span className="shrink-0 tabular-nums font-medium text-zinc-950">
                                  {vf.primary}
                                  {vf.secondary && (
                                    <span className="ml-1.5 font-normal text-[11px] text-zinc-400">
                                      {vf.secondary}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                          {item.variants.length > 3 && (
                            <p className="text-[11px] font-medium text-zinc-500 underline underline-offset-2">
                              {t.moreVariants(item.variants.length - 3)}
                            </p>
                          )}
                        </div>
                      ) : item.cookingStyles.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            {item.pricingType === "MARKET_PRICE" ? (
                              <>
                                <span className="rounded border border-brand-subtle bg-brand-subtle px-1.5 py-0.5 text-[11px] font-semibold text-zinc-900">
                                  {c.marketPrice}
                                </span>
                                <span className="text-[12px] tabular-nums text-zinc-500">
                                  {marketRange?.primary ?? t.dailyWeighIn}
                                </span>
                              </>
                            ) : (
                              dualPrice && (
                                <>
                                  <span className="text-[14px] font-semibold tabular-nums text-zinc-950">
                                    {dualPrice.primary}
                                  </span>
                                  {dualPrice.secondary && (
                                    <span className="text-[11px] tabular-nums text-zinc-500">
                                      {dualPrice.secondary}
                                    </span>
                                  )}
                                </>
                              )
                            )}
                          </div>
                          <div className="space-y-1 border-t border-zinc-100 pt-2 text-[12px]">
                            {item.cookingStyles.slice(0, 2).map((style) => (
                              <div
                                key={style.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-zinc-600">
                                  {resolveLocalized(
                                    locale,
                                    style.nameKm,
                                    style.nameEn
                                  )}
                                </span>
                                <span className="shrink-0 tabular-nums text-[11px] text-zinc-500">
                                  {style.surcharge > 0
                                    ? formatSurcharge(
                                        style.surcharge,
                                        currencyConfig,
                                        { locale, localeOnly: true }
                                      ).primary
                                    : t.included}
                                </span>
                              </div>
                            ))}
                            {item.cookingStyles.length > 2 && (
                              <p className="text-[11px] font-medium text-zinc-500">
                                {t.moreStyles(item.cookingStyles.length - 2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-zinc-400">
                              {item.pricingType === "MARKET_PRICE"
                                ? t.pricingLabel
                                : t.primaryCurrencyLabel(tenant.currency)}
                            </p>
                            <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-zinc-950">
                              {item.pricingType === "MARKET_PRICE"
                                ? c.marketPrice
                                : dualPrice?.primary}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-zinc-400">
                              {item.pricingType === "MARKET_PRICE"
                                ? t.estimatedLabel
                                : t.dualCurrencyLabel}
                            </p>
                            <p className="mt-0.5 text-[13px] font-medium tabular-nums text-zinc-600">
                              {item.pricingType === "MARKET_PRICE"
                                ? marketRange?.primary ?? "—"
                                : dualPrice?.secondary ?? t.singleCurrencyOnly}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                          item.isAvailable
                            ? "border-zinc-200 bg-white text-zinc-800"
                            : "border-zinc-200 bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.isAvailable ? "bg-emerald-600" : "bg-zinc-400"
                          }`}
                        />
                        {item.isAvailable ? c.inStock : c.soldOut}
                      </span>
                      <NativeSwitch
                        checked={item.isAvailable}
                        onChange={(checked) =>
                          onToggleAvailability(item, checked)
                        }
                        label={dishTitle}
                        srOnlyLabel
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditDish(item)}
                      aria-label={`Edit ${dishTitle}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    {t.colDish}
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    {t.colCategory}
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    {t.colPriceMode}
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    {t.colOptions}
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    {t.colStock}
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    {t.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredItems.map((item) => {
                  const dishTitle = resolveLocalized(
                    locale,
                    item.nameKm,
                    item.nameEn,
                    item.name
                  );
                  const dualPrice =
                    item.pricingType === "MARKET_PRICE"
                      ? null
                      : formatDualPrice(item.price, currencyConfig, {
                          locale,
                          localeOnly: true,
                          weightUnit:
                            item.pricingType === "WEIGHT_BASED"
                              ? item.weightUnit
                              : null,
                        });
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-[#FAFAFA]"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={dishTitle}
                              width={36}
                              height={36}
                              loading="lazy"
                              decoding="async"
                              className="h-9 w-9 shrink-0 rounded-md border border-zinc-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-[#FAFAFA] text-zinc-400">
                              <UtensilsCrossed
                                className="h-3.5 w-3.5"
                                strokeWidth={1.5}
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p
                              className={`truncate font-semibold ${
                                item.isAvailable
                                  ? "text-zinc-950"
                                  : "text-zinc-400"
                              }`}
                            >
                              {dishTitle}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-zinc-600">
                        {item.categoryName}
                      </td>

                      <td className="px-4 py-2.5 tabular-nums">
                        {item.pricingType === "MARKET_PRICE" ? (
                          <span className="rounded border border-brand-subtle bg-brand-subtle px-2 py-0.5 text-[11px] font-medium text-zinc-900">
                            {c.marketPrice}
                            {item.weightUnit
                              ? ` (${formatWeightUnit(item.weightUnit, locale)})`
                              : ""}
                          </span>
                        ) : (
                          dualPrice && (
                            <div>
                              <span className="font-medium text-zinc-950">
                                {dualPrice.primary}
                              </span>
                              {dualPrice.secondary && (
                                <span className="ml-1.5 text-[11px] text-zinc-400">
                                  {dualPrice.secondary}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-[12px] tabular-nums text-zinc-500">
                        {item.cookingStyles.length > 0
                          ? t.stylesCount(item.cookingStyles.length)
                          : item.variants.length > 0
                            ? t.variantsCount(item.variants.length)
                            : t.standardOption}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <NativeSwitch
                            checked={item.isAvailable}
                            onChange={(checked) =>
                              onToggleAvailability(item, checked)
                            }
                            label={dishTitle}
                            srOnlyLabel
                          />
                          <span className="text-[12px] text-zinc-600">
                            {item.isAvailable ? c.inStock : c.soldOut}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditDish(item)}
                            aria-label={`Edit ${dishTitle}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDish(item)}
                            aria-label={`Delete ${dishTitle}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
