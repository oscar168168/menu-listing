"use client";

import { useRef, useState } from "react";
import { ChevronDown, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { NativeSwitch } from "@/components/ui/NativeSwitch";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { compressImageForUpload } from "@/lib/image-resize";
import {
  PRESET_SEAFOOD_TAGS,
  SEAFOOD_TAG_DICTIONARY,
  WEIGHT_UNIT_LABELS,
} from "@/lib/i18n";
import type {
  CookingStyleOption,
  ItemVariant,
  PricingType,
  PrimaryCurrency,
  SerializedCategory,
  SerializedCookingStylePreset,
  SerializedMenuItem,
  WeightUnit,
} from "@/types/menu";

export interface ItemFormPayload {
  categoryId: string;
  nameKm: string;
  nameEn: string;
  descriptionKm: string;
  descriptionEn: string;
  pricingType: PricingType;
  weightUnit: WeightUnit | null;
  price: number;
  marketPriceMin: number | null;
  marketPriceMax: number | null;
  variants: ItemVariant[];
  cookingStyles: CookingStyleOption[];
  imageUrl: string | null;
  tags: string[];
  isAvailable: boolean;
}

interface ItemEditorModalProps {
  open: boolean;
  editingItem: SerializedMenuItem | null;
  defaultCategoryId: string;
  categories: SerializedCategory[];
  cookingStylePresets: SerializedCookingStylePreset[];
  currency: PrimaryCurrency;
  onClose: () => void;
  onSave: (payload: ItemFormPayload) => Promise<void>;
}

const WEIGHT_UNIT_OPTIONS: WeightUnit[] = [
  "PER_100G",
  "PER_500G",
  "PER_KG",
  "PER_PIECE",
  "PER_PORTION",
];

function ItemEditorForm({
  editingItem,
  defaultCategoryId,
  categories,
  cookingStylePresets,
  currency,
  onClose,
  onSave,
}: Omit<ItemEditorModalProps, "open">) {
  // --- Core 5 Simple Fields ---
  const [nameEn, setNameEn] = useState(
    editingItem?.nameEn ?? editingItem?.name ?? ""
  );
  const [categoryId, setCategoryId] = useState(
    editingItem?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? ""
  );
  const [price, setPrice] = useState(
    editingItem
      ? currency === "KHR"
        ? String(Math.round(editingItem.price))
        : editingItem.price.toFixed(2)
      : ""
  );
  const [isSignature, setIsSignature] = useState(
    editingItem?.tags.includes("Signature") ?? false
  );
  const [isAvailable, setIsAvailable] = useState(
    editingItem?.isAvailable ?? true
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    editingItem?.imageUrl ?? null
  );

  // --- Optional Advanced Fields (collapsed inside <details>) ---
  const [nameKm, setNameKm] = useState(editingItem?.nameKm ?? "");
  const [descriptionEn, setDescriptionEn] = useState(
    editingItem?.descriptionEn ?? editingItem?.description ?? ""
  );
  const [descriptionKm, setDescriptionKm] = useState(
    editingItem?.descriptionKm ?? ""
  );
  const [pricingType, setPricingType] = useState<PricingType>(
    editingItem?.pricingType ?? "FIXED"
  );
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    editingItem?.weightUnit ?? "PER_KG"
  );
  const [marketMin, setMarketMin] = useState(
    editingItem?.marketPriceMin != null
      ? String(editingItem.marketPriceMin)
      : ""
  );
  const [marketMax, setMarketMax] = useState(
    editingItem?.marketPriceMax != null
      ? String(editingItem.marketPriceMax)
      : ""
  );
  const [variants, setVariants] = useState<
    Array<{ label: string; labelKm: string; price: string }>
  >(
    editingItem
      ? editingItem.variants.map((v) => ({
          label: v.label,
          labelKm: v.labelKm ?? "",
          price:
            currency === "KHR"
              ? String(Math.round(v.price))
              : v.price.toFixed(2),
        }))
      : []
  );
  const [cookingStyles, setCookingStyles] = useState<
    Array<{ id: string; nameKm: string; nameEn: string; surcharge: string }>
  >(
    editingItem
      ? editingItem.cookingStyles.map((s) => ({
          id: s.id,
          nameKm: s.nameKm,
          nameEn: s.nameEn,
          surcharge: String(s.surcharge),
        }))
      : []
  );
  const [extraTags, setExtraTags] = useState<string[]>(
    (editingItem?.tags ?? []).filter((t) => t !== "Signature")
  );

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExtraTag = (tag: string) => {
    setExtraTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAttachPresetStyle = (preset: SerializedCookingStylePreset) => {
    const alreadyExists = cookingStyles.some(
      (s) =>
        (preset.nameEn &&
          s.nameEn.toLowerCase() === preset.nameEn.toLowerCase()) ||
        (preset.nameKm && s.nameKm === preset.nameKm)
    );
    if (alreadyExists) return;
    setCookingStyles((prev) => [
      ...prev,
      {
        id: `style-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nameKm: preset.nameKm,
        nameEn: preset.nameEn,
        surcharge: String(preset.defaultSurcharge),
      },
    ]);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const optimized = await compressImageForUpload(file, 1200);
      const formData = new FormData();
      formData.append("file", optimized);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Upload failed");
      }
      setImageUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() && !nameKm.trim()) {
      setError("Dish name is required.");
      return;
    }

    const numericPrice =
      pricingType === "MARKET_PRICE" ? 0 : Number(price || 0);
    if (
      pricingType !== "MARKET_PRICE" &&
      (Number.isNaN(numericPrice) || numericPrice < 0)
    ) {
      setError("Enter a valid price.");
      return;
    }

    const parsedVariants: ItemVariant[] = [];
    for (const v of variants) {
      if (!v.label.trim() && !v.labelKm.trim() && !v.price.trim()) continue;
      const vp = Number(v.price);
      if ((!v.label.trim() && !v.labelKm.trim()) || Number.isNaN(vp) || vp < 0) {
        setError("Every variant requires a label and valid price.");
        return;
      }
      parsedVariants.push({
        label: v.label.trim() || v.labelKm.trim(),
        labelKm: v.labelKm.trim() || undefined,
        price: vp,
      });
    }

    const parsedStyles: CookingStyleOption[] = [];
    for (const s of cookingStyles) {
      if (!s.nameKm.trim() && !s.nameEn.trim()) continue;
      const fee = Number(s.surcharge || 0);
      if (Number.isNaN(fee) || fee < 0) {
        setError("Cooking style surcharges must be 0 or greater.");
        return;
      }
      parsedStyles.push({
        id: s.id,
        nameKm: s.nameKm.trim(),
        nameEn: s.nameEn.trim(),
        surcharge: fee,
      });
    }

    const parsedMin = marketMin.trim() ? Number(marketMin) : null;
    const parsedMax = marketMax.trim() ? Number(marketMax) : null;

    const mergedTags = [
      ...(isSignature ? ["Signature"] : []),
      ...extraTags.filter((t) => t !== "Signature"),
    ];

    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        categoryId,
        nameKm: nameKm.trim(),
        nameEn: nameEn.trim(),
        descriptionKm: descriptionKm.trim(),
        descriptionEn: descriptionEn.trim(),
        pricingType,
        weightUnit: pricingType === "FIXED" ? null : weightUnit,
        price: numericPrice,
        marketPriceMin:
          pricingType === "MARKET_PRICE" &&
          parsedMin !== null &&
          !Number.isNaN(parsedMin)
            ? parsedMin
            : null,
        marketPriceMax:
          pricingType === "MARKET_PRICE" &&
          parsedMax !== null &&
          !Number.isNaN(parsedMax)
            ? parsedMax
            : null,
        variants: parsedVariants,
        cookingStyles: parsedStyles,
        imageUrl,
        tags: mergedTags,
        isAvailable,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save dish");
    } finally {
      setSubmitting(false);
    }
  };

  const advancedCount =
    (nameKm.trim() ? 1 : 0) +
    (descriptionEn.trim() || descriptionKm.trim() ? 1 : 0) +
    (pricingType !== "FIXED" ? 1 : 0) +
    cookingStyles.length +
    variants.length +
    extraTags.length;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
      {/* 1. Photo + Name (Fast 5-Second Primary Entry) */}
      <div className="flex items-start gap-3.5">
        <div className="shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
              e.target.value = "";
            }}
          />
          {imageUrl ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <img
                src={imageUrl}
                alt="Dish photo"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 hover:text-zinc-950"
              >
                <X className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-[#FAFAFA] text-zinc-500 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[11px] font-medium">
                {uploading ? "..." : "Photo"}
              </span>
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label
              htmlFor="dish-name-main"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Dish name
            </label>
            <input
              id="dish-name-main"
              type="text"
              required={!nameKm.trim()}
              maxLength={120}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Kampot Pepper Crab"
              autoFocus
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>
          {imageUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
            >
              {uploading ? "Uploading..." : "Change photo"}
            </button>
          )}
        </div>
      </div>

      {/* 2. Price & Category Side-by-Side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="dish-price-main"
            className="block text-[12px] font-medium text-zinc-700"
          >
            {pricingType === "MARKET_PRICE"
              ? "Price (Market Price)"
              : `Price (${currency})`}
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-zinc-200 bg-white focus-within:border-brand">
            <span className="pl-3 pr-1 text-[13px] font-medium text-zinc-500">
              {currency === "KHR" ? "៛" : "$"}
            </span>
            <input
              id="dish-price-main"
              type="number"
              step={currency === "KHR" ? "100" : "0.01"}
              min="0"
              disabled={pricingType === "MARKET_PRICE"}
              required={pricingType !== "MARKET_PRICE"}
              value={pricingType === "MARKET_PRICE" ? "" : price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={
                pricingType === "MARKET_PRICE"
                  ? "Market price"
                  : currency === "KHR"
                    ? "28000"
                    : "12.50"
              }
              className="w-full bg-transparent py-2 pr-3 text-[14px] tabular-nums text-zinc-950 placeholder:text-zinc-400 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="dish-category-main"
            className="block text-[12px] font-medium text-zinc-700"
          >
            Category
          </label>
          <div className="mt-1">
            <NativeSelect
              id="dish-category-main"
              value={categoryId}
              onChange={setCategoryId}
              fullWidth
              options={categories.map((cat) => ({
                value: cat.id,
                label: cat.nameEn || cat.name,
              }))}
            />
          </div>
        </div>
      </div>

      {/* 3. Two Simple 1-Tap Toggles: Signature? & In Stock? */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-zinc-900">Signature</p>
            <p className="text-[11px] text-zinc-500">Highlight on menu</p>
          </div>
          <NativeSwitch
            checked={isSignature}
            onChange={setIsSignature}
            label="Signature dish"
            srOnlyLabel
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-zinc-900">In stock</p>
            <p className="text-[11px] text-zinc-500">Available today</p>
          </div>
          <NativeSwitch
            checked={isAvailable}
            onChange={setIsAvailable}
            label="In stock"
            srOnlyLabel
          />
        </div>
      </div>

      {/* 4. Collapsed On-Demand Advanced Options (<details>) */}
      <details className="ui-details rounded-lg border border-zinc-200 bg-white">
        <summary className="flex items-center justify-between px-3.5 py-2.5 text-[12.5px] font-medium text-zinc-700 hover:bg-[#FAFAFA] rounded-lg">
          <span>
            More options
            <span className="ml-1.5 font-normal text-zinc-400">
              (Khmer, description, weight / market price, cooking styles)
            </span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {advancedCount > 0 && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-600">
                {advancedCount}
              </span>
            )}
            <ChevronDown
              className="ui-details-chevron h-4 w-4 text-zinc-400 transition-transform"
              strokeWidth={1.5}
            />
          </div>
        </summary>

        <div className="space-y-4 border-t border-zinc-200 p-3.5">
          {/* Khmer Name & Descriptions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="dish-name-km"
                lang="km"
                className="block text-[12px] font-medium text-zinc-700"
              >
                Khmer name (ខ្មែរ)
              </label>
              <input
                id="dish-name-km"
                type="text"
                lang="km"
                maxLength={120}
                value={nameKm}
                onChange={(e) => setNameKm(e.target.value)}
                placeholder="ឧ. ក្តាមឆាម្រេចកំពត"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-950 focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="dish-desc-en"
                className="block text-[12px] font-medium text-zinc-700"
              >
                Description (English)
              </label>
              <textarea
                id="dish-desc-en"
                rows={2}
                maxLength={500}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                placeholder="Ingredients or serving note..."
                className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-950 focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="dish-desc-km"
                lang="km"
                className="block text-[12px] font-medium text-zinc-700"
              >
                Description (Khmer)
              </label>
              <textarea
                id="dish-desc-km"
                lang="km"
                rows={2}
                maxLength={500}
                value={descriptionKm}
                onChange={(e) => setDescriptionKm(e.target.value)}
                placeholder="ព័ត៌មានបន្ថែម..."
                className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-950 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Model */}
          <div className="space-y-2.5 border-t border-zinc-100 pt-3">
            <span className="block text-[12px] font-medium text-zinc-700">
              Pricing mode
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "FIXED", label: "Fixed" },
                  { id: "WEIGHT_BASED", label: "By Weight" },
                  { id: "MARKET_PRICE", label: "Market Price" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPricingType(opt.id)}
                  className={`rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    pricingType === opt.id
                      ? "border-brand bg-brand"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {pricingType === "WEIGHT_BASED" && (
              <NativeSelect
                ariaLabel="Weight unit"
                value={weightUnit}
                onChange={(v) => setWeightUnit(v as WeightUnit)}
                fullWidth
                options={WEIGHT_UNIT_OPTIONS.map((unit) => ({
                  value: unit,
                  label: `${WEIGHT_UNIT_LABELS[unit].en} (${WEIGHT_UNIT_LABELS[unit].km})`,
                }))}
              />
            )}

            {pricingType === "MARKET_PRICE" && (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  step={currency === "KHR" ? "500" : "0.5"}
                  value={marketMin}
                  onChange={(e) => setMarketMin(e.target.value)}
                  placeholder="Est. min"
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums focus:border-brand focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step={currency === "KHR" ? "500" : "0.5"}
                  value={marketMax}
                  onChange={(e) => setMarketMax(e.target.value)}
                  placeholder="Est. max"
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums focus:border-brand focus:outline-none"
                />
                <NativeSelect
                  ariaLabel="Market price unit"
                  value={weightUnit}
                  onChange={(v) => setWeightUnit(v as WeightUnit)}
                  fullWidth
                  options={WEIGHT_UNIT_OPTIONS.map((unit) => ({
                    value: unit,
                    label: WEIGHT_UNIT_LABELS[unit].shortEn,
                  }))}
                />
              </div>
            )}
          </div>

          {/* Extra Tags */}
          <div className="space-y-2 border-t border-zinc-100 pt-3">
            <span className="block text-[12px] font-medium text-zinc-700">
              Extra tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SEAFOOD_TAGS.filter((t) => t !== "Signature").map((tag) => {
                const selected = extraTags.includes(tag);
                const km = SEAFOOD_TAG_DICTIONARY[tag]?.km;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleExtraTag(tag)}
                    aria-pressed={selected}
                    className={`rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors ${
                      selected
                        ? "border-brand bg-brand"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {tag}
                    {km ? (
                      <span lang="km" className="ml-1 opacity-75">
                        ({km})
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cooking Styles */}
          <div className="space-y-2 border-t border-zinc-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-zinc-700">
                Cooking styles
              </span>
              <button
                type="button"
                onClick={() =>
                  setCookingStyles((prev) => [
                    ...prev,
                    {
                      id: `style-${Date.now()}`,
                      nameKm: "",
                      nameEn: "",
                      surcharge: "0",
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-600 hover:text-zinc-950"
              >
                <Plus className="h-3 w-3" strokeWidth={1.75} />
                Add style
              </button>
            </div>

            {cookingStylePresets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {cookingStylePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAttachPresetStyle(preset)}
                    className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-white"
                  >
                    <Plus className="h-2.5 w-2.5 text-zinc-400" strokeWidth={1.75} />
                    {preset.nameEn || preset.nameKm}
                  </button>
                ))}
              </div>
            )}

            {cookingStyles.map((style, idx) => (
              <div
                key={style.id}
                className="grid grid-cols-[1fr_1fr_76px_28px] gap-1.5"
              >
                <input
                  type="text"
                  lang="km"
                  placeholder="ខ្មែរ"
                  value={style.nameKm}
                  onChange={(e) =>
                    setCookingStyles((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, nameKm: e.target.value } : row
                      )
                    )
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px]"
                />
                <input
                  type="text"
                  placeholder="English"
                  value={style.nameEn}
                  onChange={(e) =>
                    setCookingStyles((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, nameEn: e.target.value } : row
                      )
                    )
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px]"
                />
                <input
                  type="number"
                  min="0"
                  step={currency === "KHR" ? "500" : "0.5"}
                  placeholder={`+${currency}`}
                  value={style.surcharge}
                  onChange={(e) =>
                    setCookingStyles((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, surcharge: e.target.value } : row
                      )
                    )
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px] tabular-nums"
                />
                <button
                  type="button"
                  aria-label="Remove cooking style"
                  onClick={() =>
                    setCookingStyles((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {/* Size Variants */}
          <div className="space-y-2 border-t border-zinc-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-zinc-700">
                Size / portion variants
              </span>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    { label: "", labelKm: "", price: price || "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-600 hover:text-zinc-950"
              >
                <Plus className="h-3 w-3" strokeWidth={1.75} />
                Add variant
              </button>
            </div>

            {variants.map((variant, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_84px_28px] gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Label (e.g. Large)"
                  value={variant.label}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, label: e.target.value } : row
                      )
                    )
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px]"
                />
                <input
                  type="number"
                  step={currency === "KHR" ? "100" : "0.01"}
                  min="0"
                  placeholder="Price"
                  value={variant.price}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, price: e.target.value } : row
                      )
                    )
                  }
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px] tabular-nums"
                />
                <button
                  type="button"
                  aria-label="Remove variant"
                  onClick={() =>
                    setVariants((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
          {/* Optional External Image URL */}
          <div className="border-t border-zinc-100 pt-3">
            <label
              htmlFor="dish-image-url-opt"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Image URL (optional)
            </label>
            <input
              id="dish-image-url-opt"
              type="text"
              maxLength={500}
              value={imageUrl ?? ""}
              onChange={(e) => setImageUrl(e.target.value || null)}
              placeholder="https://... or /images/..."
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </details>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-3.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : editingItem
              ? "Save dish"
              : "Add dish"}
        </button>
      </div>
    </form>
  );
}

export function ItemEditorModal({
  open,
  editingItem,
  defaultCategoryId,
  categories,
  cookingStylePresets,
  currency,
  onClose,
  onSave,
}: ItemEditorModalProps) {
  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={editingItem ? "Edit Dish" : "Add Dish"}
      subtitle="Name, price, signature, stock, and photo — done in seconds."
      maxWidthClass="max-w-lg"
    >
      {open && (
        <ItemEditorForm
          key={editingItem?.id ?? `new-item-${defaultCategoryId}`}
          editingItem={editingItem}
          defaultCategoryId={defaultCategoryId}
          categories={categories}
          cookingStylePresets={cookingStylePresets}
          currency={currency}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </NativeDialog>
  );
}
