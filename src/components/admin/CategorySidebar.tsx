"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { SerializedCategory } from "@/types/menu";

interface CategorySidebarProps {
  categories: SerializedCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: SerializedCategory) => void;
  onDeleteCategory: (category: SerializedCategory) => void;
  onToggleVisibility: (category: SerializedCategory, nextVisible: boolean) => void;
  onMoveCategory: (index: number, direction: -1 | 1) => void;
  onReorderByIds: (fromId: string, targetId: string) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onToggleVisibility,
  onMoveCategory,
  onReorderByIds,
}: CategorySidebarProps) {
  const [catSearch, setCatSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const totalDishes = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.items.length, 0),
    [categories]
  );

  const visibleCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameKm.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
  }, [categories, catSearch]);

  return (
    <aside
      aria-label="Category navigation"
      className="flex h-full w-full flex-col bg-white"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3.5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
          Categories
        </span>
        <button
          type="button"
          onClick={onCreateCategory}
          aria-label="New category"
          title="New category"
          className="inline-flex h-6 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950"
        >
          <Plus className="h-3 w-3" strokeWidth={1.75} />
          New
        </button>
      </div>

      {/* Category Filter Input (super handy when a venue has 10-30 categories) */}
      {categories.length > 5 && (
        <div className="border-b border-zinc-100 px-3 py-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Filter categories..."
              aria-label="Filter categories"
              className="w-full rounded-md border border-zinc-200 bg-[#FAFAFA] py-1 pl-7 pr-2 text-[12px] text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Scrollable Category List */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-2 py-2.5 space-y-0.5">
        {/* All Dishes Root Item */}
        <button
          type="button"
          onClick={() => onSelectCategory("ALL")}
          aria-current={selectedCategoryId === "ALL" ? "page" : undefined}
          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
            selectedCategoryId === "ALL"
              ? "bg-brand-subtle font-semibold text-zinc-950"
              : "font-medium text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950"
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Layers className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} />
            <span className="truncate">All Dishes</span>
          </span>
          <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
            {totalDishes}
          </span>
        </button>

        <div className="my-2 border-t border-zinc-100" />

        {visibleCategories.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-[12px] text-zinc-400">
            {categories.length === 0
              ? "No categories yet."
              : "No matching categories."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visibleCategories.map((cat) => {
              const realIdx = categories.findIndex((c) => c.id === cat.id);
              const isSelected = selectedCategoryId === cat.id;
              return (
                <li
                  key={cat.id}
                  draggable={!catSearch}
                  onDragStart={() => setDraggedId(cat.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedId && draggedId !== cat.id) {
                      onReorderByIds(draggedId, cat.id);
                    }
                    setDraggedId(null);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`group rounded-lg transition-colors ${
                    isSelected
                      ? "bg-brand-subtle"
                      : "hover:bg-zinc-100/75"
                  } ${draggedId === cat.id ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-1 px-1.5 py-1.5">
                    {!catSearch && (
                      <GripVertical
                        className="h-3.5 w-3.5 shrink-0 cursor-grab text-zinc-300 group-hover:text-zinc-400"
                        strokeWidth={1.5}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectCategory(cat.id)}
                      aria-current={isSelected ? "page" : undefined}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`block truncate text-[13px] ${
                          !cat.isVisible
                            ? "text-zinc-400 line-through"
                            : isSelected
                              ? "font-semibold text-zinc-950"
                              : "font-medium text-zinc-700 group-hover:text-zinc-950"
                        }`}
                      >
                        {cat.nameEn || cat.name}
                      </span>
                      {cat.nameKm && (
                        <span
                          lang="km"
                          className="block truncate text-[11px] text-zinc-500"
                        >
                          {cat.nameKm}
                        </span>
                      )}
                    </button>

                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                        isSelected
                          ? "bg-brand"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {cat.items.length}
                    </span>
                  </div>

                  {/* Compact Inline Category Controls (visible on selected or hover/focus-within) */}
                  <div
                    className={`items-center justify-end gap-0.5 border-t border-zinc-200/70 px-2 py-1 ${
                      isSelected
                        ? "flex"
                        : "hidden group-hover:flex group-focus-within:flex"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(cat, !cat.isVisible)}
                      aria-label={
                        cat.isVisible
                          ? `Hide ${cat.nameEn}`
                          : `Show ${cat.nameEn}`
                      }
                      title={cat.isVisible ? "Visible on menu" : "Hidden"}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white hover:text-zinc-950"
                    >
                      {cat.isVisible ? (
                        <Eye className="h-3 w-3" strokeWidth={1.5} />
                      ) : (
                        <EyeOff className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
                      )}
                    </button>

                    {!catSearch && (
                      <>
                        <button
                          type="button"
                          disabled={realIdx <= 0}
                          onClick={() => onMoveCategory(realIdx, -1)}
                          aria-label={`Move ${cat.nameEn} up`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white hover:text-zinc-950 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          disabled={realIdx >= categories.length - 1}
                          onClick={() => onMoveCategory(realIdx, 1)}
                          aria-label={`Move ${cat.nameEn} down`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white hover:text-zinc-950 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditCategory(cat)}
                      aria-label={`Edit ${cat.nameEn}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white hover:text-zinc-950"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat)}
                      aria-label={`Delete ${cat.nameEn}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Compact Sidebar Footer */}
      <div className="border-t border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5 text-[11px] tabular-nums text-zinc-500">
        {categories.length} categories · {totalDishes} dishes
      </div>
    </aside>
  );
}
