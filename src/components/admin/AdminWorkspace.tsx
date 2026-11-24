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
import { getTenantThemeStyle } from "@/lib/theme";
import { CategorySidebar } from "@/components/admin/CategorySidebar";
import type { ItemFormPayload } from "@/components/admin/ItemEditorModal";
import { MenuManager } from "@/components/admin/MenuManager";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { Toast, type ToastMessage } from "@/components/ui/Toast";

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
import type {
  SerializedCategory,
  SerializedCookingStylePreset,
  SerializedMenuItem,
  SerializedTenant,
  SessionUser,
} from "@/types/menu";

type AdminSection = "menu" | "quick" | "theme" | "qr";

interface AdminWorkspaceProps {
  initialTenant: SerializedTenant;
  initialCategories: SerializedCategory[];
  cookingStylePresets: SerializedCookingStylePreset[];
  user: SessionUser;
  isImpersonating: boolean;
}

const SECTION_LABELS: Record<AdminSection, string> = {
  menu: "Menu Catalog",
  quick: "Quick Stock & Price",
  theme: "Brand & Currency",
  qr: "QR Center",
};

export function AdminWorkspace({
  initialTenant,
  initialCategories,
  cookingStylePresets,
  user,
  isImpersonating,
}: AdminWorkspaceProps) {
  const router = useRouter();
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

  // Modals owned at workspace level so sidebar + quick '+' rail button work from anywhere
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

  // Press '/' to focus quick search (skip when already typing inside an input/textarea)
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
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const showsCategorySidebar =
    activeSection === "menu" || activeSection === "quick";

  // --- Category Mutations ---
  const handleSaveCategory = async (payload: {
    nameEn: string;
    nameKm: string;
    isVisible: boolean;
  }) => {
    const canonical = payload.nameKm || payload.nameEn;
    if (editingCategory) {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");

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
      notify(`Updated category "${canonical}"`);
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
        throw new Error(data.error ?? "Creation failed");
      }
      const created = data.category;
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryId(created.id);
      notify(`Added category "${canonical}"`);
    }
  };

  const handleToggleCategoryVisibility = async (
    category: SerializedCategory,
    nextVisible: boolean
  ) => {
    const previous = categories;
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
      if (!res.ok) throw new Error("Failed");
      notify(
        nextVisible
          ? `"${category.nameKm || category.nameEn}" is now visible`
          : `"${category.nameKm || category.nameEn}" hidden from menu`
      );
    } catch {
      setCategories(previous);
      notify("Could not update category visibility", "error");
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
        body: JSON.stringify({ orderedIds: normalized.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      notify("Category order saved");
    } catch {
      setCategories(previous);
      notify("Could not save category order", "error");
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
    const fromIdx = categories.findIndex((c) => c.id === fromId);
    const toIdx = categories.findIndex((c) => c.id === targetId);
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
    setCategories((prev) => prev.filter((c) => c.id !== target.id));
    if (selectedCategoryId === target.id) setSelectedCategoryId("ALL");

    try {
      const res = await fetch(`/api/admin/categories/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      notify(`Deleted category "${target.nameKm || target.nameEn}"`);
    } catch {
      setCategories(previous);
      notify("Could not delete category", "error");
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
        throw new Error(data.error ?? "Update failed");
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
      notify(`Saved "${updatedItem.nameKm || updatedItem.nameEn}"`);
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
        throw new Error(data.error ?? "Creation failed");
      }
      const createdItem = data.item;

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === createdItem.categoryId
            ? { ...cat, items: [...cat.items, createdItem] }
            : cat
        )
      );
      notify(`Added "${createdItem.nameKm || createdItem.nameEn}"`);
    }
  };

  const handleToggleItemAvailability = async (
    item: SerializedMenuItem,
    nextAvailable: boolean
  ) => {
    const previous = categories;
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
      if (!res.ok) throw new Error("Toggle failed");
      notify(
        nextAvailable
          ? `"${item.nameKm || item.nameEn}" marked In Stock (មាន)`
          : `"${item.nameKm || item.nameEn}" marked Sold Out (អស់)`
      );
    } catch {
      setCategories(previous);
      notify("Failed to update availability", "error");
    }
  };

  const confirmDeleteItem = async () => {
    if (!deletingItem) return;
    const target = deletingItem;
    setDeletingItem(null);
    const previous = categories;

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
      if (!res.ok) throw new Error("Delete failed");
      notify(`Removed "${target.nameKm || target.nameEn}"`);
    } catch {
      setCategories(previous);
      notify("Could not delete dish", "error");
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
  const initials = (user.name || user.email)
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
      label: "Menu Catalog",
      icon: <UtensilsCrossed className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
    {
      id: "quick",
      label: "Quick Stock & Price",
      icon: <Zap className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
    {
      id: "theme",
      label: "Brand & Currency",
      icon: <Palette className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
    {
      id: "qr",
      label: "QR Center",
      icon: <QrCode className="h-[18px] w-[18px]" strokeWidth={1.5} />,
    },
  ];

  const handleSectionSelect = (section: AdminSection) => {
    setActiveSection(section);
    // Automatically open live 375px preview when editing Brand & Currency on wide desktop screens
    if (section === "theme" && typeof window !== "undefined" && window.innerWidth >= 1280) {
      setShowPreview(true);
    }
  };

  return (
    <div
      style={themeVars}
      className="flex min-h-dvh flex-col bg-[#FAFAFA] text-zinc-950"
    >
      {/* Super Admin Impersonation Bar */}
      {isImpersonating && (
        <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-[12px] text-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Super Admin inspection mode — managing{" "}
              <strong lang="km" className="font-semibold text-white">
                {tenant.nameKm || tenant.nameEn || tenant.name}
              </strong>{" "}
              (<code className="font-mono text-zinc-400">/m/{tenant.slug}</code>)
            </span>
            <button
              type="button"
              onClick={() => void handleExitImpersonation()}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              Return to Super Admin
            </button>
          </div>
        </div>
      )}

      {/* Dual-Rail Sidebar + Main Workspace Body */}
      <div className="flex flex-1 min-h-0">
        {/* 1. Far-Left Primary Icon Rail (Desktop) */}
        <aside
          aria-label="Primary workspace modules"
          className="sticky top-0 hidden h-dvh w-[56px] shrink-0 flex-col items-center justify-between border-r border-zinc-200 bg-white py-3 sm:flex"
        >
          <div className="flex flex-col items-center gap-2.5">
            {/* Venue Monogram */}
            <Link
              href={`/m/${tenant.slug}`}
              target="_blank"
              title={`${tenant.nameKm || tenant.nameEn} — Open live menu`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-[#FAFAFA] text-[12px] font-bold text-zinc-950"
            >
              {(tenant.nameKm || tenant.nameEn || tenant.name).slice(0, 1).toUpperCase()}
            </Link>

            {/* Quick Add Dish Accent Button */}
            <button
              type="button"
              disabled={categories.length === 0}
              onClick={() => openItemModal(null)}
              title="Add new dish"
              aria-label="Add new dish"
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
                title={
                  sidebarOpen
                    ? "Collapse category sidebar"
                    : "Expand category sidebar"
                }
                aria-label={
                  sidebarOpen
                    ? "Collapse category sidebar"
                    : "Expand category sidebar"
                }
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
              title={
                showPreview
                  ? "Hide 375px live preview"
                  : "Show 375px live preview"
              }
              aria-label={
                showPreview
                  ? "Hide 375px live preview"
                  : "Show 375px live preview"
              }
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
              title="Sign out"
              aria-label="Sign out"
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

        {/* 3. Right Content Column (Top Breadcrumb Header + Main Workspace + Optional Mobile Preview) */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 sm:px-5">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Sidebar Drawer Trigger */}
              {showsCategorySidebar && (
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label="Open category sidebar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 lg:hidden"
                >
                  <MenuIcon className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}

              {/* Semantic Breadcrumbs (modern-web-guidance `breadcrumbs`) */}
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
                      <span
                        lang="km"
                        className="truncate max-w-[140px] sm:max-w-none"
                      >
                        {tenant.nameKm || tenant.nameEn || tenant.name}
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
                      {SECTION_LABELS[activeSection]}
                    </a>
                  </li>
                  {showsCategorySidebar && selectedCategory && (
                    <li>
                      <a
                        href={`#cat-${selectedCategory.id}`}
                        onClick={(e) => e.preventDefault()}
                        aria-current="page"
                        lang="km"
                        className="font-semibold text-zinc-950 truncate max-w-[160px]"
                      >
                        {selectedCategory.nameKm ||
                          selectedCategory.nameEn ||
                          selectedCategory.name}
                      </a>
                    </li>
                  )}
                </ol>
              </nav>
            </div>

            {/* Center Global Quick Search (Press '/' to focus) */}
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
                  placeholder="Search dishes or press '/'..."
                  aria-label="Quick search dishes"
                  className="w-full rounded-lg border border-zinc-200 bg-[#FAFAFA] py-1.5 pl-8 pr-8 text-[12.5px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:bg-white focus:outline-none"
                />
                {globalSearch ? (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch("")}
                    aria-label="Clear search"
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
                {tenant.vendorMode === "CART" ? "Add to Cart" : "Listing Only"}{" "}
                · {tenant.currency}
              </span>

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
                {showPreview ? "Hide preview" : "Live preview"}
              </button>

              <Link
                href={`/m/${tenant.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <span className="hidden sm:inline">Live menu</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>

              <span
                title={user.email}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-950 text-[11px] font-semibold text-white"
              >
                {initials}
              </span>
            </div>
          </header>

          {/* Compact Mobile Section Bar (shown < sm when left rail is hidden) */}
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
                    tenant={tenant}
                    onDraftChange={setTenant}
                    onSaved={setTenant}
                    onNotify={notify}
                  />
                )}

                {activeSection === "qr" && (
                  <QrCenter tenant={tenant} onNotify={notify} />
                )}
              </div>

              {showPreview && (
                <div className="hidden xl:block">
                  <MobilePreviewFrame tenant={tenant} categories={categories} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Category Sidebar Drawer (< lg) */}
      <NativeDialog
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Categories"
        subtitle="Select a category to filter your menu."
        maxWidthClass="max-w-sm"
      >
        <div className="max-h-[70dvh]">
          <CategorySidebar
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

      {/* Modals (loaded on first open) */}
      {categoryModalMounted && (
        <CategoryModal
          open={categoryModalOpen}
          editingCategory={editingCategory}
          onClose={() => setCategoryModalOpen(false)}
          onSave={handleSaveCategory}
        />
      )}

      {itemModalMounted && (
        <ItemEditorModal
          open={itemModalOpen}
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
        title="Delete category?"
        subtitle="This removes the category and all dishes inside it."
        maxWidthClass="max-w-sm"
      >
        <div className="p-5">
          <p className="text-[14px] text-zinc-700">
            Delete{" "}
            <span lang="km" className="font-semibold text-zinc-950">
              {deletingCategory?.nameKm || deletingCategory?.nameEn}
            </span>
            {deletingCategory && deletingCategory.items.length > 0
              ? ` and its ${deletingCategory.items.length} dish(es)`
              : ""}
            ? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setDeletingCategory(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteCategory()}
              className="rounded-md bg-red-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-700"
            >
              Delete category
            </button>
          </div>
        </div>
      </NativeDialog>

      {/* Delete Dish Confirmation */}
      <NativeDialog
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Delete dish?"
        maxWidthClass="max-w-sm"
      >
        <div className="p-5">
          <p className="text-[14px] text-zinc-700">
            Permanently remove{" "}
            <span lang="km" className="font-semibold text-zinc-950">
              {deletingItem?.nameKm || deletingItem?.nameEn}
            </span>{" "}
            from your menu?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setDeletingItem(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteItem()}
              className="rounded-md bg-red-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-700"
            >
              Delete dish
            </button>
          </div>
        </div>
      </NativeDialog>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
