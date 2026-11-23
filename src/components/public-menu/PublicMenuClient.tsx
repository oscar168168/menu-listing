"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import {
  ClipboardList,
  Info,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  formatDualPrice,
  formatMarketRange,
  type DualCurrencyConfig,
} from "@/lib/currency";
import {
  localizeTag,
  resolveLocalized,
  UI_COPY,
} from "@/lib/i18n";
import { ItemDetailSheet } from "@/components/public-menu/ItemDetailSheet";
import { VenueInfoSheet } from "@/components/public-menu/VenueInfoSheet";
import { ShortlistModal } from "@/components/public-menu/ShortlistModal";
import type {
  CookingStyleOption,
  ItemVariant,
  Locale,
  SerializedCategory,
  SerializedMenuItem,
  SerializedTenant,
  ShortlistEntry,
} from "@/types/menu";

interface PublicMenuClientProps {
  tenant: SerializedTenant;
  categories: SerializedCategory[];
  tableCode?: string;
  isPreview?: boolean;
}

function getShortlistStorageKey(slug: string): string {
  return `menuos:shortlist:${slug}`;
}

const storageListeners = new Set<() => void>();
function emitStorageUpdate() {
  for (const listener of storageListeners) listener();
}
function subscribeStorage(listener: () => void) {
  storageListeners.add(listener);
  const onNativeStorage = () => listener();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onNativeStorage);
  }
  return () => {
    storageListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onNativeStorage);
    }
  };
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const val = localStorage.getItem("menuos:locale");
    return val === "km" ? "km" : "en";
  } catch {
    return "en";
  }
}

function readStoredShortlistRaw(slug: string): string {
  if (typeof window === "undefined") return "[]";
  try {
    return localStorage.getItem(getShortlistStorageKey(slug)) ?? "[]";
  } catch {
    return "[]";
  }
}

export function PublicMenuClient({
  tenant,
  categories,
  tableCode,
  isPreview = false,
}: PublicMenuClientProps) {
  const isCartMode = (tenant.vendorMode ?? "CART") === "CART";

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.isVisible && c.items.length > 0),
    [categories]
  );

  const [previewLocale, setPreviewLocale] = useState<Locale>("en");
  const storedLocale = useSyncExternalStore(
    subscribeStorage,
    readStoredLocale,
    () => "en" as Locale
  );
  const locale = isPreview ? previewLocale : storedLocale;

  const [previewShortlist, setPreviewShortlist] = useState<ShortlistEntry[]>(
    []
  );
  const storedShortlistRaw = useSyncExternalStore(
    subscribeStorage,
    () => readStoredShortlistRaw(tenant.slug),
    () => "[]"
  );
  const storedShortlist = useMemo<ShortlistEntry[]>(() => {
    try {
      const parsed = JSON.parse(storedShortlistRaw) as ShortlistEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [storedShortlistRaw]);
  const shortlist = isPreview ? previewShortlist : storedShortlist;

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    visibleCategories[0]?.id ?? ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<SerializedMenuItem | null>(
    null
  );
  const [infoOpen, setInfoOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [editableTableCode, setEditableTableCode] = useState(tableCode ?? "");

  const stripRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isManualScrollRef = useRef(false);
  const hasMountedPillEffectRef = useRef(false);

  const t = UI_COPY[locale];

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

  const switchLocale = (next: Locale) => {
    if (isPreview) {
      setPreviewLocale(next);
      return;
    }
    try {
      localStorage.setItem("menuos:locale", next);
      emitStorageUpdate();
    } catch {
      setPreviewLocale(next);
    }
  };

  const persistShortlist = useCallback(
    (updater: (prev: ShortlistEntry[]) => ShortlistEntry[]) => {
      if (!isCartMode) return;
      if (isPreview) {
        setPreviewShortlist(updater);
        return;
      }
      const currentRaw = readStoredShortlistRaw(tenant.slug);
      let current: ShortlistEntry[] = [];
      try {
        const parsed = JSON.parse(currentRaw) as ShortlistEntry[];
        if (Array.isArray(parsed)) current = parsed;
      } catch {
        current = [];
      }
      const next = updater(current);
      try {
        localStorage.setItem(
          getShortlistStorageKey(tenant.slug),
          JSON.stringify(next)
        );
        emitStorageUpdate();
      } catch {
        // ignore storage quota error
      }
    },
    [tenant.slug, isPreview, isCartMode]
  );

  const handleAddToShortlist = useCallback(
    ({
      item,
      variant,
      cookingStyle,
      quantity,
    }: {
      item: SerializedMenuItem;
      variant?: ItemVariant;
      cookingStyle?: CookingStyleOption;
      quantity: number;
    }) => {
      if (!isCartMode) return;
      const key = `${item.id}::${variant?.label ?? "base"}::${cookingStyle?.id ?? "none"}`;
      persistShortlist((prev) => {
        const existing = prev.find((e) => e.key === key);
        if (existing) {
          return prev.map((e) =>
            e.key === key ? { ...e, quantity: e.quantity + quantity } : e
          );
        }
        return [
          ...prev,
          {
            key,
            itemId: item.id,
            nameKm: item.nameKm,
            nameEn: item.nameEn || item.name,
            pricingType: item.pricingType,
            weightUnit: item.weightUnit,
            unitPrice: variant ? variant.price : item.price,
            marketPriceMin: item.marketPriceMin,
            marketPriceMax: item.marketPriceMax,
            variantLabel: variant?.label,
            variantLabelKm: variant?.labelKm,
            cookingStyle,
            quantity,
          },
        ];
      });
    },
    [persistShortlist, isCartMode]
  );

  const handleUpdateShortlistQty = useCallback(
    (key: string, delta: number) => {
      persistShortlist((prev) =>
        prev
          .map((entry) =>
            entry.key === key
              ? { ...entry, quantity: entry.quantity + delta }
              : entry
          )
          .filter((entry) => entry.quantity > 0)
      );
    },
    [persistShortlist]
  );

  const handleClearShortlist = useCallback(() => {
    persistShortlist(() => []);
    setShortlistOpen(false);
  }, [persistShortlist]);

  const itemQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of shortlist) {
      map.set(entry.itemId, (map.get(entry.itemId) ?? 0) + entry.quantity);
    }
    return map;
  }, [shortlist]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const cat of visibleCategories) {
      for (const item of cat.items) {
        for (const tag of item.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet);
  }, [visibleCategories]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleCategories
      .map((cat) => {
        const matchingItems = cat.items.filter((item) => {
          const matchesQuery =
            q.length === 0 ||
            item.nameEn.toLowerCase().includes(q) ||
            item.nameKm.toLowerCase().includes(q) ||
            item.descriptionEn.toLowerCase().includes(q) ||
            item.descriptionKm.toLowerCase().includes(q) ||
            item.tags.some(
              (tag) =>
                tag.toLowerCase().includes(q) ||
                localizeTag(tag, "km").toLowerCase().includes(q)
            );

          const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every((tag) => item.tags.includes(tag));

          return matchesQuery && matchesTags;
        });

        return { ...cat, items: matchingItems };
      })
      .filter((cat) => cat.items.length > 0);
  }, [visibleCategories, searchQuery, selectedTags]);

  const effectiveActiveCategoryId = useMemo(() => {
    if (filteredCategories.some((c) => c.id === activeCategoryId)) {
      return activeCategoryId;
    }
    return filteredCategories[0]?.id ?? "";
  }, [filteredCategories, activeCategoryId]);

  // Non-blocking QR scan analytics ping
  useEffect(() => {
    if (isPreview) return;
    const dedupeKey = `menuos:scanned:${tenant.slug}:${tableCode ?? "direct"}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, "1");
    } catch {
      // ignore
    }

    const payload = JSON.stringify({
      slug: tenant.slug,
      tableCode: tableCode ?? null,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/scans", blob);
    } else {
      void fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  }, [tenant.slug, tableCode, isPreview]);

  // Scroll-spy synchronization across category sections
  useEffect(() => {
    if (filteredCategories.length <= 1 || isPreview) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollRef.current) return;
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        const topEntry = intersecting[0];
        if (topEntry) {
          const catId = topEntry.target.getAttribute("data-category-id");
          if (catId) setActiveCategoryId(catId);
        }
      },
      {
        rootMargin: "-120px 0px -60% 0px",
        threshold: 0,
      }
    );

    for (const cat of filteredCategories) {
      const el = sectionRefs.current.get(cat.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [filteredCategories, isPreview]);

  // Scrollability affordance fallback when scroll-driven animations unsupported
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || typeof CSS === "undefined") return;
    if (CSS.supports("animation-timeline", "scroll()")) return;

    const first = strip.firstElementChild;
    const last = strip.lastElementChild;
    if (!first || !last) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, intersectionRatio } of entries) {
          strip.classList.toggle(
            target === first ? "more-start" : "more-end",
            intersectionRatio < 1
          );
        }
      },
      { root: strip, threshold: 1, rootMargin: "1px" }
    );

    observer.observe(first);
    observer.observe(last);
    return () => observer.disconnect();
  }, [filteredCategories.length]);

  // Center active pill smoothly when user scrolls or switches category
  useEffect(() => {
    if (!hasMountedPillEffectRef.current) {
      hasMountedPillEffectRef.current = true;
      return;
    }
    const activePill = pillRefs.current.get(effectiveActiveCategoryId);
    if (!activePill) return;
    activePill.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [effectiveActiveCategoryId]);

  const scrollToCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const el = sectionRefs.current.get(catId);
    if (!el) return;
    isManualScrollRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      isManualScrollRef.current = false;
    }, 650);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  };

  const shortlistCount = useMemo(
    () => (isCartMode ? shortlist.reduce((sum, e) => sum + e.quantity, 0) : 0),
    [shortlist, isCartMode]
  );
  const shortlistHasMarket = useMemo(
    () => shortlist.some((e) => e.pricingType === "MARKET_PRICE"),
    [shortlist]
  );
  const shortlistSubtotal = useMemo(
    () =>
      shortlist.reduce((sum, entry) => {
        const styleFee = entry.cookingStyle?.surcharge ?? 0;
        if (entry.pricingType === "MARKET_PRICE") {
          return sum + styleFee * entry.quantity;
        }
        return sum + (entry.unitPrice + styleFee) * entry.quantity;
      }, 0),
    [shortlist]
  );
  const shortlistSubtotalFormatted = useMemo(
    () => formatDualPrice(shortlistSubtotal, currencyConfig, { locale }),
    [shortlistSubtotal, currencyConfig, locale]
  );

  const venueName = resolveLocalized(
    locale,
    tenant.nameKm,
    tenant.nameEn,
    tenant.name
  );
  const venueTagline = resolveLocalized(
    locale,
    tenant.meta.taglineKm,
    tenant.meta.taglineEn ?? tenant.meta.tagline
  );
  const footerNote = resolveLocalized(
    locale,
    tenant.meta.footerNoteKm,
    tenant.meta.footerNote
  );

  return (
    <div
      lang={locale}
      className={
        isPreview
          ? "min-h-full bg-[#FAFAFA] text-zinc-950"
          : "mx-auto min-h-dvh w-full max-w-[480px] bg-[#FAFAFA] text-zinc-950 sm:border-x sm:border-zinc-200"
      }
    >
      {/* Optional compact cover strip */}
      {tenant.coverUrl && (
        <div className="relative h-24 w-full overflow-hidden border-b border-zinc-200 bg-zinc-100">
          <Image
            src={tenant.coverUrl}
            alt=""
            fill
            sizes="480px"
            priority
            className="object-cover"
          />
        </div>
      )}

      {/* Compact Venue Header: Identity + Language Toggle + Info + Optional Cart Bag */}
      <header className="border-b border-zinc-200 bg-white px-3.5 pt-3.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {tenant.logoUrl && (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <Image
                  src={tenant.logoUrl}
                  alt={`${venueName} logo`}
                  fill
                  sizes="36px"
                  className="object-contain p-1"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[16px] font-semibold text-zinc-950">
                  {venueName}
                </h1>
                {editableTableCode && (
                  <span className="km-badge shrink-0 rounded border border-brand-subtle bg-brand-subtle px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-900">
                    {`${t.table} ${editableTableCode}`}
                  </span>
                )}
              </div>
              {venueTagline && (
                <p className="truncate text-[11px] text-zinc-500">
                  {venueTagline}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Instant ខ្មែរ | EN Toggle */}
            <div
              role="group"
              aria-label="Language switcher"
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-[#FAFAFA] p-0.5 text-[11px] font-medium"
            >
              <button
                type="button"
                lang="km"
                onClick={() => switchLocale("km")}
                aria-pressed={locale === "km"}
                className={`rounded-md px-2 py-1 leading-[1.35] transition-colors ${
                  locale === "km"
                    ? "bg-brand"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                ខ្មែរ
              </button>
              <button
                type="button"
                lang="en"
                onClick={() => switchLocale("en")}
                aria-pressed={locale === "en"}
                className={`rounded-md px-2 py-1 leading-[1.35] transition-colors ${
                  locale === "en"
                    ? "bg-brand"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label={t.hoursAndInfo}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            >
              <Info className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {/* Top-Right Cart / Bag Button — Mode 1 (CART) ONLY */}
            {isCartMode && (
              <button
                type="button"
                onClick={() => setShortlistOpen(true)}
                aria-label={`${t.shortlistBarCta} (${shortlistCount})`}
                className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 transition-colors hover:bg-zinc-100"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                {shortlistCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold tabular-nums leading-none">
                    {shortlistCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Search Bar + Filter + Category Pills */}
      <nav
        aria-label="Menu search and categories"
        className="sticky top-0 z-20 border-b border-zinc-200 bg-[#FAFAFA]/95 backdrop-blur-xs"
      >
        {/* Clean Pill Search Input with Inline Filter Button (Reference Layout) */}
        <div className="px-3.5 pt-2.5 pb-2">
          <div className="relative flex items-center rounded-xl border border-zinc-200 bg-white focus-within:border-brand">
            <Search
              className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-zinc-400"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label="Search menu items"
              className="w-full bg-transparent py-2 pl-2.5 pr-2 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="p-1.5 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
            {availableTags.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                aria-label="Filter dishes"
                aria-expanded={filterOpen}
                className={`mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  filterOpen || selectedTags.length > 0
                    ? "bg-brand"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Status / Dietary Filter Pills */}
        {filterOpen && availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-200 bg-white px-3.5 py-2">
            {availableTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`km-pill rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-brand bg-brand"
                      : "border-zinc-200 bg-[#FAFAFA] text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {localizeTag(tag, locale)}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="ml-auto text-[12px] font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-900"
              >
                {t.clear}
              </button>
            )}
          </div>
        )}

        {/* Horizontal Scrollable Category Pills */}
        <div
          ref={stripRef}
          className="category-scroll-strip flex items-center gap-1.5 px-3.5 pb-2.5"
        >
          {filteredCategories.map((cat) => {
            const isActive = cat.id === effectiveActiveCategoryId;
            const catLabel = resolveLocalized(
              locale,
              cat.nameKm,
              cat.nameEn,
              cat.name
            );
            return (
              <button
                key={cat.id}
                ref={(node) => {
                  if (node) pillRefs.current.set(cat.id, node);
                  else pillRefs.current.delete(cat.id);
                }}
                type="button"
                onClick={() => scrollToCategory(cat.id)}
                aria-current={isActive ? "true" : undefined}
                className={`km-pill shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "bg-brand"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {catLabel}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2-Column Big Image + Food Title + Price Product Grid */}
      <main className={shortlistCount > 0 ? "pb-28" : "pb-10"}>
        {filteredCategories.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-medium text-zinc-900">
              {t.noMatchesTitle}
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">
              {searchQuery || selectedTags.length > 0
                ? t.noMatchesBody
                : t.noItemsBody}
            </p>
            {(searchQuery || selectedTags.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                }}
                className="km-btn mt-4 rounded-md border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-900 hover:bg-zinc-100"
              >
                {t.resetFilters}
              </button>
            )}
          </div>
        ) : (
          filteredCategories.map((category) => {
            const catTitle = resolveLocalized(
              locale,
              category.nameKm,
              category.nameEn,
              category.name
            );
            return (
              <section
                key={category.id}
                data-category-id={category.id}
                ref={(node) => {
                  if (node) sectionRefs.current.set(category.id, node);
                  else sectionRefs.current.delete(category.id);
                }}
                className="scroll-mt-[106px] pt-3"
              >
                <div className="flex items-baseline justify-between px-4 pb-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-zinc-600">
                    {catTitle}
                  </h2>
                  <span className="text-[11px] tabular-nums text-zinc-400">
                    {category.items.length}
                  </span>
                </div>

                {/* 2-Column Visual Product Card Grid */}
                <div className="grid grid-cols-2 gap-3 px-3.5 pb-2">
                  {category.items.map((item) => {
                    const title = resolveLocalized(
                      locale,
                      item.nameKm,
                      item.nameEn,
                      item.name
                    );
                    const needsSheetConfig =
                      item.variants.length > 0 || item.cookingStyles.length > 0;
                    const inShortlistQty = itemQtyMap.get(item.id) ?? 0;
                    const simpleKey = `${item.id}::base::none`;
                    const cornerBadgeTag = !item.isAvailable
                      ? t.soldOut
                      : item.tags.includes("Live Tank")
                        ? localizeTag("Live Tank", locale)
                        : null;

                    let dualFormatted: {
                      primary: string;
                      secondary: string | null;
                    } | null = null;
                    let marketRange: {
                      primary: string;
                      secondary: string | null;
                    } | null = null;

                    if (item.pricingType === "MARKET_PRICE") {
                      marketRange = formatMarketRange(
                        item.marketPriceMin,
                        item.marketPriceMax,
                        currencyConfig,
                        { weightUnit: item.weightUnit, locale }
                      );
                    } else if (item.variants.length > 0) {
                      const minPrice = Math.min(
                        ...item.variants.map((v) => v.price)
                      );
                      const maxPrice = Math.max(
                        ...item.variants.map((v) => v.price)
                      );
                      dualFormatted = formatDualPrice(
                        minPrice,
                        currencyConfig,
                        {
                          locale,
                          prefix:
                            minPrice !== maxPrice ? t.fromPrice : undefined,
                        }
                      );
                    } else {
                      dualFormatted = formatDualPrice(
                        item.price,
                        currencyConfig,
                        {
                          weightUnit:
                            item.pricingType === "WEIGHT_BASED"
                              ? item.weightUnit
                              : null,
                          locale,
                        }
                      );
                    }

                    return (
                      <article
                        key={item.id}
                        className={`product-card flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white ${
                          !item.isAvailable ? "opacity-55" : ""
                        }`}
                      >
                        {/* 1. Big Square Image Area */}
                        <div className="relative aspect-square w-full overflow-hidden bg-[#F4F4F5]">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={title}
                              fill
                              sizes="(max-width: 480px) 46vw, 220px"
                              loading="lazy"
                              className={`object-cover ${
                                !item.isAvailable ? "grayscale-[35%]" : ""
                              }`}
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-300"
                            >
                              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white/80">
                                <UtensilsCrossed
                                  className="h-5 w-5 text-zinc-400"
                                  strokeWidth={1.5}
                                />
                              </div>
                            </div>
                          )}

                          {/* Restrained Top-Left Micro Badge (Sold Out or Live Tank) */}
                          {cornerBadgeTag && (
                            <span
                              className={`km-badge pointer-events-none absolute left-2 top-2 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                                !item.isAvailable
                                  ? "border-zinc-300 bg-white/95 text-zinc-600"
                                  : "border-zinc-200 bg-white/95 text-zinc-900"
                              }`}
                            >
                              {cornerBadgeTag}
                            </span>
                          )}

                          {/* Mode 1 (CART) Only: Clean Floating Add / Stepper Button */}
                          {isCartMode && item.isAvailable && (
                            <div className="absolute bottom-2 right-2">
                              {!needsSheetConfig && inShortlistQty > 0 ? (
                                <div className="inline-flex items-center rounded-full border border-brand bg-white">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateShortlistQty(simpleKey, -1)
                                    }
                                    aria-label={`Remove one ${title}`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-l-full text-zinc-800 hover:bg-zinc-100"
                                  >
                                    <Minus
                                      className="h-3 w-3"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                  <span className="min-w-[1.2rem] text-center text-[12px] font-semibold tabular-nums text-zinc-950">
                                    {inShortlistQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateShortlistQty(simpleKey, 1)
                                    }
                                    aria-label={`Add one more ${title}`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-r-full bg-brand"
                                  >
                                    <Plus
                                      className="h-3 w-3"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (needsSheetConfig) {
                                      setSelectedItem(item);
                                    } else {
                                      handleAddToShortlist({
                                        item,
                                        quantity: 1,
                                      });
                                    }
                                  }}
                                  aria-label={`Add ${title} to cart`}
                                  className={`inline-flex h-8 items-center justify-center gap-1 rounded-full border text-[12px] font-semibold transition-colors ${
                                    inShortlistQty > 0
                                      ? "border-brand bg-brand px-2.5"
                                      : "w-8 border-zinc-200 bg-white/95 text-zinc-900 hover:border-zinc-400 hover:bg-white"
                                  }`}
                                >
                                  <Plus
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.75}
                                  />
                                  {inShortlistQty > 0 && (
                                    <span className="tabular-nums">
                                      {inShortlistQty}
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Food Title + 3. Price (Clean Centered Editorial Hierarchy) */}
                        <div className="flex flex-1 flex-col items-center justify-between gap-1.5 px-2.5 pt-2.5 pb-3 text-center">
                          <h3 className="w-full text-[13.5px] font-semibold text-zinc-950">
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="card-trigger line-clamp-2 w-full text-center text-zinc-950"
                            >
                              {title}
                            </button>
                          </h3>

                          <div className="w-full">
                            {item.pricingType === "MARKET_PRICE" ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="km-badge inline-block rounded-md border border-brand-subtle bg-brand-subtle px-2 py-0.5 text-[11px] font-semibold text-zinc-900">
                                  {t.marketPrice}
                                </span>
                                {marketRange && (
                                  <span className="text-[11px] tabular-nums text-zinc-500">
                                    {marketRange.primary}
                                  </span>
                                )}
                              </div>
                            ) : (
                              dualFormatted && (
                                <div className="flex flex-col items-center tabular-nums">
                                  <span className="text-[14px] font-semibold text-zinc-950">
                                    {dualFormatted.primary}
                                  </span>
                                  {dualFormatted.secondary && (
                                    <span className="text-[11px] text-zinc-500">
                                      {dualFormatted.secondary}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Minimal Venue Footer */}
      <footer className="border-t border-zinc-200 bg-white px-4 py-6 text-[12px] text-zinc-500">
        {tenant.meta.serviceNote && (
          <p className="font-medium text-zinc-700">{tenant.meta.serviceNote}</p>
        )}
        {footerNote && <p className="mt-1 text-zinc-600">{footerNote}</p>}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
          <span>{venueName}</span>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700"
          >
            {t.hoursAndInfo}
          </button>
        </div>
      </footer>

      {/* Sticky Floating Cart / Show-to-Staff Bar — Mode 1 (CART) ONLY */}
      {isCartMode && shortlistCount > 0 && (
        <div
          className={
            isPreview
              ? "sticky bottom-3 z-30 mx-3 pb-1"
              : "fixed bottom-4 left-1/2 z-30 w-[min(calc(100%-1.5rem),456px)] -translate-x-1/2"
          }
        >
          <button
            type="button"
            onClick={() => setShortlistOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-brand px-4 py-3 text-left transition-opacity hover:opacity-95"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-black/15 px-1.5 text-[13px] font-bold tabular-nums">
                {shortlistCount}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">
                  {t.shortlistBarCta}
                </p>
                {shortlistHasMarket && (
                  <p className="truncate text-[11px] opacity-80">
                    {t.shortlistIncludesMarket}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-right tabular-nums">
              <div>
                <p className="text-[14px] font-semibold">
                  {shortlistSubtotalFormatted.primary}
                  {shortlistHasMarket ? "+" : ""}
                </p>
                {shortlistSubtotalFormatted.secondary && (
                  <p className="text-[11px] opacity-80">
                    {shortlistSubtotalFormatted.secondary}
                  </p>
                )}
              </div>
              <ClipboardList className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            </div>
          </button>
        </div>
      )}

      {/* Item Detail Native Bottom Sheet */}
      <ItemDetailSheet
        item={selectedItem}
        tenant={tenant}
        locale={locale}
        enableCart={isCartMode}
        onClose={() => setSelectedItem(null)}
        onAddToShortlist={handleAddToShortlist}
      />

      {/* Venue Info Native Bottom Sheet */}
      <VenueInfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        tenant={tenant}
        locale={locale}
      />

      {/* Show-to-Staff Cart Summary Modal — Mode 1 (CART) ONLY */}
      {isCartMode && (
        <ShortlistModal
          open={shortlistOpen}
          onClose={() => setShortlistOpen(false)}
          tenant={tenant}
          locale={locale}
          entries={shortlist}
          tableCode={editableTableCode}
          onTableCodeChange={setEditableTableCode}
          onUpdateQty={handleUpdateShortlistQty}
          onClearAll={handleClearShortlist}
        />
      )}
    </div>
  );
}
