"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  LogOut,
  Menu as MenuIcon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Search,
  Smartphone,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import { resolveLocalized } from "@/lib/i18n";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import { getTenantThemeStyle } from "@/lib/theme";
import { CategorySidebar } from "@/components/admin/CategorySidebar";
import type { ItemFormPayload } from "@/components/admin/ItemEditorModal";
import { MenuManager } from "@/components/admin/MenuManager";
import { NativeDialog } from "@/components/ui/NativeDialog";
import {
  PortalLanguageSwitcher,
  usePortalLocale,
} from "@/components/ui/PortalLanguageSwitcher";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import type {
  Locale,
  SerializedCategory,
  SerializedCookingStylePreset,
  SerializedMenuItem,
  SerializedTenant,
  SessionUser,
} from "@/types/menu";

const CategoryModal = dynamic(
  () =>
    import("@/components/admin/CategoryModal").then((m) => m.CategoryModal),
  { ssr: false }
);

const ItemEditorModal = dynamic(
  () =>
    import("@/components/admin/ItemEditorModal").then(
      (m) => m.ItemEditorModal
    ),
  { ssr: false }
);

const QuickMarketPanel = dynamic(
  () =>
    import("@/components/admin/QuickMarketPanel").then(
      (m) => m.QuickMarketPanel
    ),
  { ssr: false }
);

const ThemeStudio = dynamic(
  () => import("@/components/admin/ThemeStudio").then((m) => m.ThemeStudio),
  { ssr: false }
);

const QrCenter = dynamic(
  () => import("@/components/admin/QrCenter").then((m) => m.QrCenter),
  { ssr: false }
);

const MobilePreviewFrame = dynamic(
  () =>
    import("@/components/admin/MobilePreviewFrame").then(
      (m) => m.MobilePreviewFrame
    ),
  { ssr: false }
);

type AdminSection = "menu" | "quick" | "theme" | "qr";

interface AdminWorkspaceProps {
  initialTenant: SerializedTenant;
  initialCategories: SerializedCategory[];
  cookingStylePresets: SerializedCookingStylePreset[];
  user: SessionUser;
  isImpersonating: boolean;
  initialLocale?: Locale;
}

export function AdminWorkspace({
  initialTenant,
  initialCategories,
  cookingStylePresets,
  user,
  isImpersonating,
  initialLocale = "km",
}: AdminWorkspaceProps) {
  const router = useRouter();
  const [locale, setLocale] = usePortalLocale(initialLocale);
  const t = PORTAL_COPY[locale].admin;
  const c = PORTAL_COPY[locale].common;

  const [tenant, setTenant] = useState<SerializedTenant>(initialTenant);
  const [categories, setCategories] =
    useState<SerializedCategory[]>(initialCategories);
  const [activeSection, setActiveSection] = useState<AdminSection>("menu");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [globalSearch, setGlobalSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMounted, setCategoryModalMounted] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<SerializedCategory | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<SerializedCategory | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalMounted, setItemModalMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<SerializedMenuItem | null>(
    null
  );
  const [deletingItem, setDeletingItem] = useState<SerializedMenuItem | null>(
    null
  );

  const openCategoryModal = useCallback((cat: SerializedCategory | null) => {
    setCategoryModalMounted(true);
    setEditingCategory(cat);
    setCategoryModalOpen(true);
  }, []);

  const openItemModal = useCallback((item: SerializedMenuItem | null) => {
    setItemModalMounted(true);
    setEditingItem(item);
    setItemModalOpen(true);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback(
    (text: string, tone: "neutral" | "error" = "neutral") => {
      setToast({ id: Date.now(), text, tone });
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const showsCategorySidebar =
    activeSection === "menu" || activeSection === "quick";

  const tenantDisplayName = resolveLocalized(
    locale,
    tenant.nameKm,
    tenant.nameEn,
    tenant.name
  );

  // --- Category Mutations ---
  const handleSaveCategory = async (payload: {
    nameEn: string;
    nameKm: string;
    isVisible: boolean;
  }) => {
    const canonical = payload.nameKm || payload.nameEn;
    const displayName = resolveLocalized(
      locale,
      payload.nameKm,
      payload.nameEn,
      canonical
    );
    if (editingCategory) {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? c.unknownError);

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id
            ? {
                ...cat,
                name: canonical,
                nameKm: payload.nameKm || canonical,
                nameEn: payload.nameEn || canonical,
                isVisible: payload.isVisible,
              }
            : cat
        )
      );
      notify(t.toastCatUpdated(displayName));
    } else {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        category?: SerializedCategory;
        error?: string;
      };
      if (!res.ok || !data.category) {
        throw new Error(data.error ?? c.unknownError);
      }
      const created = data.category;
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryId(created.id);
      notify(t.toastCatAdded(displayName));
    }
  };

  const handleToggleCategoryVisibility = async (
    category: SerializedCategory,
    nextVisible: boolean
  ) => {
    const previous = categories;
    const catName = resolveLocalized(
      locale,
      category.nameKm,
      category.nameEn,
      category.name
    );
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === category.id ? { ...cat, isVisible: nextVisible } : cat
      )
    );
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: nextVisible }),
      });
      if (!res.ok) throw new Error(t.toastCatVisError);
      notify(
        nextVisible ? t.toastCatVisible(catName) : t.toastCatHidden(catName)
      );
    } catch {
      setCategories(previous);
      notify(t.toastCatVisError, "error");
    }
  };

  const persistCategoryOrder = async (reordered: SerializedCategory[]) => {
    const previous = categories;
    const normalized = reordered.map((cat, idx) => ({
      ...cat,
      sortOrder: idx,
    }));
    setCategories(normalized);

    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: normalized.map((cat) => cat.id) }),
      });
      if (!res.ok) throw new Error(t.toastCatOrderError);
      notify(t.toastCatOrderSaved);
    } catch {
      setCategories(previous);
      notify(t.toastCatOrderError, "error");
    }
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    void persistCategoryOrder(next);
  };

  const reorderCategoryByIds = (fromId: string, targetId: string) => {
    const fromIdx = categories.findIndex((cat) => cat.id === fromId);
    const toIdx = categories.findIndex((cat) => cat.id === targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const next = [...categories];
    const [moved] = next.splice(fromIdx, 1);
    if (!moved) return;
    next.splice(toIdx, 0, moved);
    void persistCategoryOrder(next);
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    const target = deletingCategory;
    setDeletingCategory(null);
    const previous = categories;
    setCategories((prev) => prev.filter((cat) => cat.id !== target.id));
    if (selectedCategoryId === target.id) setSelectedCategoryId("ALL");

    const targetName = resolveLocalized(
      locale,
      target.nameKm,
      target.nameEn,
      target.name
    );
    try {
      const res = await fetch(`/api/admin/categories/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t.toastCatDeleteError);
      notify(t.toastCatDeleted(targetName));
    } catch {
      setCategories(previous);
      notify(t.toastCatDeleteError, "error");
    }
  };

  // --- Dish Mutations ---
  const handleSaveItem = async (payload: ItemFormPayload) => {
    if (editingItem) {
      const res = await fetch(`/api/admin/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        item?: SerializedMenuItem;
        error?: string;
      };
      if (!res.ok || !data.item) {
        throw new Error(data.error ?? c.unknownError);
      }
      const updatedItem = data.item;

      setCategories((prev) =>
        prev.map((cat) => {
          const withoutOld = cat.items.filter((i) => i.id !== updatedItem.id);
          if (cat.id === updatedItem.categoryId) {
            const wasInThisCat = cat.items.some((i) => i.id === updatedItem.id);
            if (wasInThisCat) {
              return {
                ...cat,
                items: cat.items.map((i) =>
                  i.id === updatedItem.id ? updatedItem : i
                ),
              };
            }
            return { ...cat, items: [...withoutOld, updatedItem] };
          }
          return { ...cat, items: withoutOld };
        })
      );
      notify(
        t.toastItemSaved(
          resolveLocalized(
            locale,
            updatedItem.nameKm,
            updatedItem.nameEn,
            updatedItem.name
          )
        )
      );
    } else {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        item?: SerializedMenuItem;
        error?: string;
      };
      if (!res.ok || !data.item) {
        throw new Error(data.error ?? c.unknownError);
      }
      const createdItem = data.item;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === createdItem.categoryId
            ? { ...cat, items: [...cat.items, createdItem] }
            : cat
        )
      );
      notify(
        t.toastItemAdded(
          resolveLocalized(
            locale,
            createdItem.nameKm,
            createdItem.nameEn,
            createdItem.name
          )
        )
      );
    }
  };

  const handleToggleItemAvailability = async (
    item: SerializedMenuItem,
    nextAvailable: boolean
  ) => {
    const previous = categories;
    const itemName = resolveLocalized(locale, item.nameKm, item.nameEn, item.name);
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === item.categoryId
          ? {
              ...cat,
              items: cat.items.map((i) =>
                i.id === item.id ? { ...i, isAvailable: nextAvailable } : i
              ),
            }
          : cat
      )
    );

    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextAvailable }),
      });
      if (!res.ok) throw new Error(t.toastItemAvailError);
      notify(
        nextAvailable
          ? t.toastItemInStock(itemName)
          : t.toastItemSoldOut(itemName)
      );
    } catch {
      setCategories(previous);
      notify(t.toastItemAvailError, "error");
    }
  };

  const confirmDeleteItem = async () => {
    if (!deletingItem) return;
    const target = deletingItem;
    setDeletingItem(null);
    const previous = categories;
    const targetName = resolveLocalized(
      locale,
      target.nameKm,
      target.nameEn,
      target.name
    );

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === target.categoryId
          ? { ...cat, items: cat.items.filter((i) => i.id !== target.id) }
          : cat
      )
    );

    try {
      const res = await fetch(`/api/admin/items/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t.toastItemDeleteError);
      notify(t.toastItemDeleted(targetName));
    } catch {
      setCategories(previous);
      notify(t.toastItemDeleteError, "error");
    }
  };

  const handleExitImpersonation = async () => {
    await fetch("/api/super-admin/impersonate", { method: "DELETE" });
    router.push("/super-admin");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const themeVars = getTenantThemeStyle(tenant.primaryColor);
  const initials = (user.name || user.username || user.email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "menu",
      label: t.sections.menu,
      icon: (
        <UtensilsCrossed className="h-[18px] w-[18px]" strokeWidth={1.5} />
      ),
    },
    {
      id: "quick",
      label: t.sections.quick,
      icon: <Zap className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
    {
      id: "theme",
      label: t.sections.theme,
      icon: <Palette className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
    {
      id: "qr",
      label: t.sections.qr,
      icon: <QrCode className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
  ];

  const handleSectionSelect = (section: AdminSection) => {
    setActiveSection(section);
    if (
      section === "theme" &&
      typeof window !== "undefined" &&
      window.innerWidth >= 1280
    ) {
      setShowPreview(true);
    }
  };

  const selectedCategoryTitle = selectedCategory
    ? resolveLocalized(
        locale,
        selectedCategory.nameKm,
        selectedCategory.nameEn,
        selectedCategory.name
      )
    : "";

  return (
    <div
      lang={locale}
      style={themeVars}
      className="flex min-h-dvh flex-col bg-[#FAFAFA] text-zinc-950"
    >
      {/* Super Admin Impersonation Bar */}
      {isImpersonating && (
        <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-[12px] text-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t.impersonatingPrefix}{" "}
              <strong className="font-semibold text-white">
                {tenantDisplayName}
              </strong>{" "}
              (<code className="font-mono text-zinc-400">/m/{tenant.slug}</code>)
            </span>
            <button
              type="button"
              onClick={() => void handleExitImpersonation()}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              <span>{t.returnToSuperAdmin}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dual-Rail Sidebar + Main Workspace Body */}
      <div className="flex flex-1 min-h-0">
        {/* 1. Far-Left Primary Icon Rail (Desktop) */}
        <aside
          aria-label={t.sections.menu}
          className="sticky top-0 hidden h-dvh w-[56px] shrink-0 flex-col items-center justify-between border-r border-zinc-200 bg-white py-3 sm:flex"
        >
          <div className="flex flex-col items-center gap-2.5">
            {/* Venue Monogram */}
            <Link
              href={`/m/${tenant.slug}`}
              target="_blank"
              title={t.openLiveMenuTitle(tenantDisplayName)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-[#FAFAFA] text-[12px] font-bold text-zinc-950"
            >
              {tenantDisplayName.slice(0, 1).toUpperCase()}
            </Link>

            {/* Quick Add Dish Accent Button */}
            <button
              type="button"
              disabled={categories.length === 0}
              onClick={() => openItemModal(null)}
              title={t.addNewDish}
              aria-label={t.addNewDish}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>

            <div className="my-1 h-px w-6 bg-zinc-200" />

            {/* Module Icons */}
            <nav className="flex flex-col items-center gap-1.5">
              {navItems.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSectionSelect(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? "bg-brand-subtle text-zinc-950"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    {active && (
                      <span
                        className="absolute -left-[10px] h-5 w-[3px] rounded-r bg-brand"
                        aria-hidden="true"
                      />
                    )}
                    {item.icon}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Rail Utilities */}
          <div className="flex flex-col items-center gap-1.5">
            {showsCategorySidebar && (
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                title={sidebarOpen ? t.collapseSidebar : t.expandSidebar}
                aria-label={sidebarOpen ? t.collapseSidebar : t.expandSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              title={showPreview ? t.hidePreview : t.showPreview}
              aria-label={showPreview ? t.hidePreview : t.showPreview}
              className={`hidden xl:flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                showPreview
                  ? "bg-brand-subtle text-zinc-950"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              <Smartphone className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              title={c.signOut}
              aria-label={c.signOut}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </aside>

        {/* 2. Secondary Collapsible Category Sidebar (Desktop) */}
        {showsCategorySidebar && sidebarOpen && (
          <div className="sticky top-0 hidden h-dvh w-[236px] shrink-0 border-r border-zinc-200 bg-white lg:block">
            <CategorySidebar
              locale={locale}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onCreateCategory={() => openCategoryModal(null)}
              onEditCategory={(cat) => openCategoryModal(cat)}
              onDeleteCategory={setDeletingCategory}
              onToggleVisibility={(cat, next) =>
                void handleToggleCategoryVisibility(cat, next)
              }
              onMoveCategory={moveCategory}
              onReorderByIds={reorderCategoryByIds}
            />
          </div>
        )}

        {/* 3. Right Content Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 sm:px-5">
            <div className="flex items-center gap-2.5 min-w-0">
              {showsCategorySidebar && (
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label={t.openCategoryDrawer}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 lg:hidden"
                >
                  <MenuIcon className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}

              <nav
                aria-label="Breadcrumbs"
                className="admin-breadcrumb min-w-0 text-[13px]"
              >
                <ol>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("menu");
                        setSelectedCategoryId("ALL");
                      }}
                      className="inline-flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-950"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black/15"
                        style={{ backgroundColor: tenant.primaryColor }}
                        aria-hidden="true"
                      />
                      <span className="truncate max-w-[140px] sm:max-w-none">
                        {tenantDisplayName}
                      </span>
                    </button>
                  </li>
                  <li>
                    <a
                      href={`#${activeSection}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (showsCategorySidebar) setSelectedCategoryId("ALL");
                      }}
                      aria-current={
                        !selectedCategory || !showsCategorySidebar
                          ? "page"
                          : undefined
                      }
                      className={
                        !selectedCategory || !showsCategorySidebar
                          ? "font-semibold text-zinc-950"
                          : "font-medium text-zinc-500 hover:text-zinc-950"
                      }
                    >
                      {t.sections[activeSection]}
                    </a>
                  </li>
                  {showsCategorySidebar && selectedCategory && (
                    <li>
                      <a
                        href={`#cat-${selectedCategory.id}`}
                        onClick={(e) => e.preventDefault()}
                        aria-current="page"
                        className="font-semibold text-zinc-950 truncate max-w-[160px]"
                      >
                        {selectedCategoryTitle}
                      </a>
                    </li>
                  )}
                </ol>
              </nav>
            </div>

            {/* Center Global Quick Search */}
            <div className="hidden md:block flex-1 max-w-sm">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                  strokeWidth={1.5}
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    if (activeSection !== "menu" && activeSection !== "quick") {
                      setActiveSection("menu");
                    }
                  }}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchAria}
                  className="w-full rounded-lg border border-zinc-200 bg-[#FAFAFA] py-1.5 pl-8 pr-8 text-[12.5px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:bg-white focus:outline-none"
                />
                {globalSearch ? (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch("")}
                    aria-label={t.clearSearchAria}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden 2xl:inline-flex items-center rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-1 text-[11px] font-medium text-zinc-600">
                {tenant.vendorMode === "CART" ? c.addToCart : c.listingOnly} ·{" "}
                {tenant.currency}
              </span>

              <PortalLanguageSwitcher
                locale={locale}
                onChange={setLocale}
                compact
              />

              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className={`hidden xl:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  showPreview
                    ? "border-brand bg-brand-subtle text-zinc-950"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{showPreview ? t.hidePreview : t.showPreview}</span>
              </button>

              <Link
                href={`/m/${tenant.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <span className="hidden sm:inline">{t.liveMenu}</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>

              <span
                title={user.username || user.phone || user.email}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-950 text-[11px] font-semibold text-white"
              >
                {initials}
              </span>
            </div>
          </header>

          {/* Compact Mobile Section Bar */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-1.5 sm:hidden">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSectionSelect(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium ${
                    active ? "bg-brand" : "text-zinc-600"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Workspace Area + Collapsible 375px Live Preview */}
          <main className="flex-1 px-4 py-5 sm:px-6">
            <div
              className={`grid grid-cols-1 gap-6 ${
                showPreview ? "xl:grid-cols-[minmax(0,1fr)_395px]" : ""
              }`}
            >
              <div className="min-w-0">
                {activeSection === "menu" && (
                  <MenuManager
                    locale={locale}
                    tenant={tenant}
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    searchQuery={globalSearch}
                    onSearchChange={setGlobalSearch}
                    onAddDish={() => openItemModal(null)}
                    onEditDish={(item) => openItemModal(item)}
                    onDeleteDish={setDeletingItem}
                    onToggleAvailability={(item, checked) =>
                      void handleToggleItemAvailability(item, checked)
                    }
                  />
                )}

                {activeSection === "quick" && (
                  <QuickMarketPanel
                    locale={locale}
                    tenant={tenant}
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    searchQuery={globalSearch}
                    onSearchChange={setGlobalSearch}
                    onCategoriesChange={setCategories}
                    onNotify={notify}
                  />
                )}

                {activeSection === "theme" && (
                  <ThemeStudio
                    locale={locale}
                    tenant={tenant}
                    onDraftChange={setTenant}
                    onSaved={setTenant}
                    onNotify={notify}
                  />
                )}

                {activeSection === "qr" && (
                  <QrCenter locale={locale} tenant={tenant} onNotify={notify} />
                )}
              </div>

              {showPreview && (
                <div className="hidden xl:block">
                  <MobilePreviewFrame
                    locale={locale}
                    tenant={tenant}
                    categories={categories}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Category Sidebar Drawer */}
      <NativeDialog
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title={t.mobileCategoriesTitle}
        subtitle={t.mobileCategoriesSubtitle}
        closeLabel={c.closeDialog}
        maxWidthClass="max-w-sm"
      >
        <div lang={locale} className="max-h-[70dvh]">
          <CategorySidebar
            locale={locale}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => {
              setSelectedCategoryId(id);
              setMobileDrawerOpen(false);
            }}
            onCreateCategory={() => {
              setMobileDrawerOpen(false);
              openCategoryModal(null);
            }}
            onEditCategory={(cat) => {
              setMobileDrawerOpen(false);
              openCategoryModal(cat);
            }}
            onDeleteCategory={(cat) => {
              setMobileDrawerOpen(false);
              setDeletingCategory(cat);
            }}
            onToggleVisibility={(cat, next) =>
              void handleToggleCategoryVisibility(cat, next)
            }
            onMoveCategory={moveCategory}
            onReorderByIds={reorderCategoryByIds}
          />
        </div>
      </NativeDialog>

      {/* Modals */}
      {categoryModalMounted && (
        <CategoryModal
          open={categoryModalOpen}
          locale={locale}
          editingCategory={editingCategory}
          onClose={() => setCategoryModalOpen(false)}
          onSave={handleSaveCategory}
        />
      )}

      {itemModalMounted && (
        <ItemEditorModal
          open={itemModalOpen}
          locale={locale}
          editingItem={editingItem}
          defaultCategoryId={
            selectedCategoryId !== "ALL"
              ? selectedCategoryId
              : categories[0]?.id ?? ""
          }
          categories={categories}
          cookingStylePresets={cookingStylePresets}
          currency={tenant.currency}
          onClose={() => setItemModalOpen(false)}
          onSave={handleSaveItem}
        />
      )}

      {/* Delete Category Confirmation */}
      <NativeDialog
        open={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        title={t.deleteCategoryTitle}
        subtitle={t.deleteCategorySubtitle}
        closeLabel={c.closeDialog}
        maxWidthClass="max-w-sm"
      >
        <div lang={locale} className="p-5">
          <p className="text-[14px] text-zinc-700">
            {deletingCategory
              ? t.deleteCategoryConfirm(
                  resolveLocalized(
                    locale,
                    deletingCategory.nameKm,
                    deletingCategory.nameEn,
                    deletingCategory.name
                  ),
                  deletingCategory.items.length
                )
              : ""}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setDeletingCategory(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteCategory()}
              className="rounded-md bg-red-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-700"
            >
              {t.deleteCategoryBtn}
            </button>
          </div>
        </div>
      </NativeDialog>

      {/* Delete Dish Confirmation */}
      <NativeDialog
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title={t.deleteDishTitle}
        closeLabel={c.closeDialog}
        maxWidthClass="max-w-sm"
      >
        <div lang={locale} className="p-5">
          <p className="text-[14px] text-zinc-700">
            {deletingItem
              ? t.deleteDishConfirm(
                  resolveLocalized(
                    locale,
                    deletingItem.nameKm,
                    deletingItem.nameEn,
                    deletingItem.name
                  )
                )
              : ""}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setDeletingItem(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteItem()}
              className="rounded-md bg-red-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-700"
            >
              {t.deleteDishBtn}
            </button>
          </div>
        </div>
      </NativeDialog>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
