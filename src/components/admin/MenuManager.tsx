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
import { formatWeightUnit, PRESET_SEAFOOD_TAGS } from "@/lib/i18n";
import type {
  PricingType,
  SerializedCategory,
  SerializedMenuItem,
  SerializedTenant,
} from "@/types/menu";

interface MenuManagerProps {
  tenant: SerializedTenant;
  categories: SerializedCategory[];
  selectedCategoryId: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddDish: () => void;
  onEditDish: (item: SerializedMenuItem) => void;
  onDeleteDish: (item: SerializedMenuItem) => void;
  onToggleAvailability: (item: SerializedMenuItem, nextAvailable: boolean) => void;
}

type StatusTab = "ALL" | "ACTIVE" | "SOLD_OUT" | "MARKET_PRICE";
type ViewMode = "grid" | "table";

export function MenuManager({
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
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [pricingFilter, setPricingFilter] = useState<"ALL" | PricingType>("ALL");
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
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  // Scoped to selected category (or all categories)
  const categoryScopedItems = useMemo(() => {
    const cats =
      selectedCategoryId === "ALL"
        ? categories
        : categories.filter((c) => c.id === selectedCategoryId);
    return cats.flatMap((cat) =>
      cat.items.map((item) => ({
        ...item,
        categoryName: cat.nameEn || cat.name,
        categoryNameKm: cat.nameKm,
      }))
    );
  }, [categories, selectedCategoryId]);

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
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
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
    { id: "ALL", label: "All", count: counts.all },
    { id: "ACTIVE", label: "In Stock", count: counts.active },
    { id: "SOLD_OUT", label: "Sold Out", count: counts.soldOut },
    { id: "MARKET_PRICE", label: "Market Price", count: counts.market },
  ];

  return (
    <div className="space-y-4">
      {/* Page Title & Primary CTA Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-zinc-950">
              {selectedCategory
                ? selectedCategory.nameEn || selectedCategory.name
                : "All Dishes"}
            </h1>
            {selectedCategory?.nameKm && (
              <span lang="km" className="text-[14px] text-zinc-500">
                {selectedCategory.nameKm}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Showing{" "}
            <span className="tabular-nums font-medium text-zinc-700">
              {filteredItems.length}
            </span>{" "}
            of{" "}
            <span className="tabular-nums">{categoryScopedItems.length}</span>{" "}
            items
            {selectedCategory ? ` in ${selectedCategory.nameEn}` : " across all categories"}
          </p>
        </div>

        <button
          type="button"
          disabled={categories.length === 0}
          onClick={onAddDish}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Add Dish
        </button>
      </div>

      {/* Status Tabs Bar (Underline style inspired by reference workspace) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200">
        <div role="tablist" aria-label="Dish status filters" className="flex items-center gap-1 -mb-px">
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
            aria-label="Catalog view mode"
            className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              title="Card grid view"
              aria-label="Card grid view"
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
              title="Compact list view"
              aria-label="Compact list view"
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
            placeholder="Filter dishes..."
            aria-label="Filter dishes in current category"
            className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
          />
        </div>

        <NativeSelect
          ariaLabel="Filter by pricing type"
          value={pricingFilter}
          onChange={(v) => setPricingFilter(v as "ALL" | PricingType)}
          options={[
            { value: "ALL", label: "Pricing: All" },
            { value: "FIXED", label: "Fixed Price" },
            { value: "WEIGHT_BASED", label: "Weight-Based" },
            { value: "MARKET_PRICE", label: "Market Price" },
          ]}
        />

        <NativeSelect
          ariaLabel="Filter by tag"
          value={tagFilter}
          onChange={setTagFilter}
          options={[
            { value: "ALL", label: "Tag: All" },
            ...availableTags.map((tag) => ({ value: tag, label: tag })),
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
            Reset filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="text-[14px] font-medium text-zinc-900">
            {categoryScopedItems.length === 0
              ? "No dishes in this category yet"
              : "No dishes match your active filters"}
          </p>
          <p className="mt-1 text-[12px] text-zinc-500">
            {categoryScopedItems.length === 0
              ? "Click Add Dish to create your first item here."
              : "Try resetting filters or selecting another category from the left sidebar."}
          </p>
          {categoryScopedItems.length === 0 && categories.length > 0 && (
            <button
              type="button"
              onClick={onAddDish}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-medium"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Add Dish
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ==================================================================
           CARD GRID VIEW (Size-Aware Container Query Grid — Reference UI)
           ================================================================== */
        <div className="admin-catalog-grid-container">
          <div className="admin-catalog-grid">
            {filteredItems.map((item) => {
              const dualPrice =
                item.pricingType === "MARKET_PRICE"
                  ? null
                  : formatDualPrice(item.price, currencyConfig, {
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
                      { weightUnit: item.weightUnit }
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
                    {/* Top Row: Thumbnail + Bilingual Name + Edit/Delete */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.nameEn}
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
                            className={`line-clamp-1 text-[14px] font-semibold ${
                              item.isAvailable
                                ? "text-zinc-950"
                                : "text-zinc-500"
                            }`}
                          >
                            {item.nameEn || item.nameKm}
                          </h3>
                          {item.nameKm && (
                            <p
                              lang="km"
                              className="truncate text-[12px] text-zinc-500"
                            >
                              {item.nameKm}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEditDish(item)}
                          aria-label={`Edit ${item.nameEn}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDish(item)}
                          aria-label={`Delete ${item.nameEn}`}
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
                          {tag}
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
                              currencyConfig
                            );
                            return (
                              <div
                                key={`${variant.label}-${idx}`}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate text-zinc-600">
                                  {variant.label}
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
                              +{item.variants.length - 3} more variants
                            </p>
                          )}
                        </div>
                      ) : item.cookingStyles.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            {item.pricingType === "MARKET_PRICE" ? (
                              <>
                                <span className="rounded border border-brand-subtle bg-brand-subtle px-1.5 py-0.5 text-[11px] font-semibold text-zinc-900">
                                  Market Price
                                </span>
                                <span className="text-[12px] tabular-nums text-zinc-500">
                                  {marketRange?.primary ?? "Daily weigh-in"}
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
                                  {style.nameEn || style.nameKm}
                                </span>
                                <span className="shrink-0 tabular-nums text-[11px] text-zinc-500">
                                  {style.surcharge > 0
                                    ? formatSurcharge(
                                        style.surcharge,
                                        currencyConfig
                                      ).primary
                                    : "Included"}
                                </span>
                              </div>
                            ))}
                            {item.cookingStyles.length > 2 && (
                              <p className="text-[11px] font-medium text-zinc-500">
                                +{item.cookingStyles.length - 2} more styles
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-zinc-400">
                              {item.pricingType === "MARKET_PRICE"
                                ? "Pricing"
                                : `Primary (${tenant.currency})`}
                            </p>
                            <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-zinc-950">
                              {item.pricingType === "MARKET_PRICE"
                                ? "Market Price"
                                : dualPrice?.primary}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-zinc-400">
                              {item.pricingType === "MARKET_PRICE"
                                ? "Estimated"
                                : "Dual Currency"}
                            </p>
                            <p className="mt-0.5 text-[13px] font-medium tabular-nums text-zinc-600">
                              {item.pricingType === "MARKET_PRICE"
                                ? marketRange?.primary ?? "—"
                                : dualPrice?.secondary ?? "Single"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Status Pill + Instant Toggle + Edit Arrow */}
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
                        {item.isAvailable ? "In stock" : "Sold out"}
                      </span>
                      <NativeSwitch
                        checked={item.isAvailable}
                        onChange={(checked) =>
                          onToggleAvailability(item, checked)
                        }
                        label={`Toggle stock for ${item.nameEn}`}
                        srOnlyLabel
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditDish(item)}
                      aria-label={`Open ${item.nameEn} editor`}
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
        /* ==================================================================
           COMPACT TABLE VIEW (High-Density 100+ Dish Management)
           ================================================================== */
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Dish
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Price / Mode
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Options
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredItems.map((item) => {
                  const dualPrice =
                    item.pricingType === "MARKET_PRICE"
                      ? null
                      : formatDualPrice(item.price, currencyConfig, {
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
                              alt={item.nameEn}
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
                              {item.nameEn || item.nameKm}
                            </p>
                            {item.nameKm && (
                              <p
                                lang="km"
                                className="truncate text-[11px] text-zinc-500"
                              >
                                {item.nameKm}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-zinc-600">
                        {item.categoryName}
                      </td>

                      <td className="px-4 py-2.5 tabular-nums">
                        {item.pricingType === "MARKET_PRICE" ? (
                          <span className="rounded border border-brand-subtle bg-brand-subtle px-2 py-0.5 text-[11px] font-medium text-zinc-900">
                            Market Price
                            {item.weightUnit
                              ? ` (${formatWeightUnit(item.weightUnit, "en")})`
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
                          ? `${item.cookingStyles.length} styles`
                          : item.variants.length > 0
                            ? `${item.variants.length} variants`
                            : "Standard"}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <NativeSwitch
                            checked={item.isAvailable}
                            onChange={(checked) =>
                              onToggleAvailability(item, checked)
                            }
                            label={`Toggle stock for ${item.nameEn}`}
                            srOnlyLabel
                          />
                          <span className="text-[12px] text-zinc-600">
                            {item.isAvailable ? "In stock" : "Sold out"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditDish(item)}
                            aria-label={`Edit ${item.nameEn}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDish(item)}
                            aria-label={`Delete ${item.nameEn}`}
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
