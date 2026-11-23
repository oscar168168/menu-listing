"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  LayoutGrid,
  ShoppingBag,
  Upload,
  X,
} from "lucide-react";
import { NativeSwitch } from "@/components/ui/NativeSwitch";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { compressImageForUpload } from "@/lib/image-resize";
import {
  computeThemeContrast,
  CURATED_THEME_PRESETS,
  normalizeHex,
} from "@/lib/theme";
import { formatDualPrice } from "@/lib/currency";
import type {
  KhrRounding,
  PrimaryCurrency,
  SerializedTenant,
  TenantMeta,
} from "@/types/menu";

interface ThemeStudioProps {
  tenant: SerializedTenant;
  onDraftChange: (nextTenant: SerializedTenant) => void;
  onSaved: (savedTenant: SerializedTenant) => void;
  onNotify: (text: string, tone?: "neutral" | "error") => void;
}

export function ThemeStudio({
  tenant,
  onDraftChange,
  onSaved,
  onNotify,
}: ThemeStudioProps) {
  const [hexInput, setHexInput] = useState(tenant.primaryColor);
  const [uploadingField, setUploadingField] = useState<"logo" | "cover" | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const contrast = useMemo(
    () => computeThemeContrast(tenant.primaryColor),
    [tenant.primaryColor]
  );

  const sampleConversion = useMemo(
    () =>
      formatDualPrice(tenant.currency === "USD" ? 12.5 : 51500, {
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

  const updateField = <K extends keyof SerializedTenant>(
    key: K,
    value: SerializedTenant[K]
  ) => {
    onDraftChange({ ...tenant, [key]: value });
  };

  const updateMeta = <K extends keyof TenantMeta>(key: K, value: string) => {
    onDraftChange({
      ...tenant,
      meta: {
        ...tenant.meta,
        [key]: value,
      },
    });
  };

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const normalized = normalizeHex(raw);
    if (normalized) {
      updateField("primaryColor", normalized);
    }
  };

  const selectColor = (hex: string) => {
    const normalized = normalizeHex(hex) ?? "#18181B";
    setHexInput(normalized);
    updateField("primaryColor", normalized);
  };

  const handleImageUpload = async (field: "logo" | "cover", file: File) => {
    setUploadingField(field);
    try {
      const optimized = await compressImageForUpload(
        file,
        field === "logo" ? 600 : 1200
      );
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
      updateField(field === "logo" ? "logoUrl" : "coverUrl", json.url);
      onNotify(
        field === "logo"
          ? "Logo uploaded — click Save to publish"
          : "Cover uploaded — click Save to publish"
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : "Image upload failed",
        "error"
      );
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenant.nameEn || tenant.name,
          nameKm: tenant.nameKm,
          nameEn: tenant.nameEn || tenant.name,
          primaryColor: tenant.primaryColor,
          vendorMode: tenant.vendorMode,
          currency: tenant.currency,
          showDualCurrency: tenant.showDualCurrency,
          exchangeRate: tenant.exchangeRate,
          khrRounding: tenant.khrRounding,
          logoUrl: tenant.logoUrl,
          coverUrl: tenant.coverUrl,
          meta: {
            tagline: tenant.meta.taglineEn ?? tenant.meta.tagline ?? "",
            taglineKm: tenant.meta.taglineKm ?? "",
            taglineEn: tenant.meta.taglineEn ?? tenant.meta.tagline ?? "",
            openingHours: tenant.meta.openingHours ?? "",
            address: tenant.meta.address ?? "",
            phone: tenant.meta.phone ?? "",
            telegramUrl: tenant.meta.telegramUrl ?? "",
            facebookUrl: tenant.meta.facebookUrl ?? "",
            googleMapsUrl: tenant.meta.googleMapsUrl ?? "",
            wifiName: tenant.meta.wifiName ?? "",
            wifiPassword: tenant.meta.wifiPassword ?? "",
            footerNote: tenant.meta.footerNote ?? "",
            footerNoteKm: tenant.meta.footerNoteKm ?? "",
            serviceNote: tenant.meta.serviceNote ?? "",
          },
        }),
      });
      const data = (await res.json()) as {
        tenant?: SerializedTenant;
        error?: string;
      };
      if (!res.ok || !data.tenant) {
        throw new Error(data.error ?? "Failed to save settings");
      }
      onSaved(data.tenant);
      setHexInput(data.tenant.primaryColor);
      onNotify("Settings saved");
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : "Unable to save settings",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
      {/* Main Essentials Card */}
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h1 className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-950">
            Storefront Settings
          </h1>
          <p className="text-[12px] text-zinc-500">
            Venue name, storefront mode, currency, and brand accent color.
          </p>
        </div>

        <div className="space-y-5 p-5">
          {/* 1. Venue Name */}
          <div>
            <label
              htmlFor="settings-venue-name"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Venue name
            </label>
            <input
              id="settings-venue-name"
              type="text"
              required
              maxLength={100}
              value={tenant.nameEn}
              onChange={(e) =>
                onDraftChange({
                  ...tenant,
                  name: e.target.value,
                  nameEn: e.target.value,
                })
              }
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 focus:border-brand focus:outline-none"
            />
          </div>

          {/* 2. Vendor Mode (Add to Cart vs Listing Only) */}
          <div>
            <span className="block text-[12px] font-medium text-zinc-700">
              Menu mode
            </span>
            <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateField("vendorMode", "CART")}
                aria-pressed={tenant.vendorMode === "CART"}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  tenant.vendorMode === "CART"
                    ? "border-brand bg-brand-subtle"
                    : "border-zinc-200 bg-white hover:bg-[#FAFAFA]"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                    tenant.vendorMode === "CART"
                      ? "border-brand bg-brand"
                      : "border-zinc-200 bg-[#FAFAFA] text-zinc-700"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-950">
                    Add to Cart
                  </p>
                  <p className="text-[11.5px] text-zinc-500">
                    Cart bag, + buttons &amp; Show-to-Staff
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateField("vendorMode", "LISTING_ONLY")}
                aria-pressed={tenant.vendorMode === "LISTING_ONLY"}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  tenant.vendorMode === "LISTING_ONLY"
                    ? "border-brand bg-brand-subtle"
                    : "border-zinc-200 bg-white hover:bg-[#FAFAFA]"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                    tenant.vendorMode === "LISTING_ONLY"
                      ? "border-brand bg-brand"
                      : "border-zinc-200 bg-[#FAFAFA] text-zinc-700"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-950">
                    Listing Only
                  </p>
                  <p className="text-[11.5px] text-zinc-500">
                    Pure photo menu with no cart UI
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Currency & Dual Currency */}
          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
              <div>
                <label
                  htmlFor="settings-currency"
                  className="block text-[12px] font-medium text-zinc-700"
                >
                  Primary currency
                </label>
                <div className="mt-1.5">
                  <NativeSelect
                    id="settings-currency"
                    value={tenant.currency}
                    onChange={(v) =>
                      updateField("currency", v as PrimaryCurrency)
                    }
                    fullWidth
                    options={[
                      { value: "USD", label: "USD ($) — US Dollar" },
                      { value: "KHR", label: "KHR (៛) — Cambodian Riel" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-[#FAFAFA] px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-zinc-900">
                    Dual currency
                  </p>
                  <p className="text-[11px] tabular-nums text-zinc-500">
                    {sampleConversion.primary}
                    {sampleConversion.secondary
                      ? ` / ${sampleConversion.secondary}`
                      : ""}
                  </p>
                </div>
                <NativeSwitch
                  checked={tenant.showDualCurrency}
                  onChange={(val) => updateField("showDualCurrency", val)}
                  label="Show dual currency"
                  srOnlyLabel
                />
              </div>
            </div>

            {tenant.showDualCurrency && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-[#FAFAFA] p-3">
                <div>
                  <label
                    htmlFor="settings-rate"
                    className="block text-[11px] font-medium text-zinc-600"
                  >
                    1 USD = KHR rate
                  </label>
                  <input
                    id="settings-rate"
                    type="number"
                    min={1000}
                    max={10000}
                    step={50}
                    value={tenant.exchangeRate}
                    onChange={(e) =>
                      updateField("exchangeRate", Number(e.target.value) || 4100)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums text-zinc-950 focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-zinc-600">
                    KHR rounding
                  </span>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    {([100, 500] as KhrRounding[]).map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => updateField("khrRounding", step)}
                        className={`rounded-md border py-1.5 text-[12px] font-medium tabular-nums ${
                          tenant.khrRounding === step
                            ? "border-brand bg-brand"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {step} ៛
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Primary Color (Compact Swatches + Hex + Auto Contrast Readout) */}
          <div className="space-y-2.5 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="settings-hex"
                className="text-[12px] font-medium text-zinc-700"
              >
                Brand accent color
              </label>
              <span className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-700">
                WCAG {contrast.selectedContrast.toFixed(1)}:1 · {contrast.rating}{" "}
                (Auto {contrast.foreground})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {CURATED_THEME_PRESETS.map((preset) => {
                const active =
                  tenant.primaryColor.toUpperCase() ===
                  preset.hex.toUpperCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    title={`${preset.name} (${preset.hex})`}
                    aria-label={`Select ${preset.name}`}
                    onClick={() => selectColor(preset.hex)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-transform ${
                      active
                        ? "border-zinc-950 ring-2 ring-zinc-950/20"
                        : "border-black/15 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {active && (
                      <Check
                        className="h-3.5 w-3.5"
                        strokeWidth={2.25}
                        style={{
                          color: computeThemeContrast(preset.hex).foreground,
                        }}
                      />
                    )}
                  </button>
                );
              })}

              <div className="ml-auto flex items-center gap-1.5">
                <input
                  type="color"
                  value={tenant.primaryColor}
                  onChange={(e) => selectColor(e.target.value)}
                  aria-label="Custom color picker"
                  className="h-8 w-9 cursor-pointer rounded-md border border-zinc-200 bg-white p-0.5"
                />
                <input
                  id="settings-hex"
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  maxLength={7}
                  className="w-24 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-[12px] uppercase text-zinc-950 focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collapsed Optional Disclosure 1: Logo & Cover */}
      <details className="ui-details rounded-xl border border-zinc-200 bg-white">
        <summary className="flex items-center justify-between px-5 py-3.5 text-[13.5px] font-medium text-zinc-900 hover:bg-[#FAFAFA] rounded-xl">
          <span>
            Logo &amp; Cover Header{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <ChevronDown
            className="ui-details-chevron h-4 w-4 text-zinc-400 transition-transform"
            strokeWidth={1.5}
          />
        </summary>

        <div className="grid grid-cols-1 gap-4 border-t border-zinc-200 p-5 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-[#FAFAFA] p-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white text-[11px] text-zinc-400">
              {tenant.logoUrl ? (
                <>
                  <img
                    src={tenant.logoUrl}
                    alt="Venue logo"
                    className="h-full w-full object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("logoUrl", null)}
                    aria-label="Remove logo"
                    className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={1.75} />
                  </button>
                </>
              ) : (
                <span>Logo</span>
              )}
            </div>
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload("logo", file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploadingField === "logo"}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                {uploadingField === "logo" ? "Uploading..." : "Upload logo"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-[#FAFAFA] p-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-zinc-800">
                Cover strip
              </p>
              <p className="text-[11px] text-zinc-500">
                {tenant.coverUrl ? "Cover active" : "None uploaded"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {tenant.coverUrl && (
                <button
                  type="button"
                  onClick={() => updateField("coverUrl", null)}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[11px] text-zinc-600 hover:text-red-600"
                >
                  Remove
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload("cover", file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploadingField === "cover"}
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                {uploadingField === "cover" ? "..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* Collapsed Optional Disclosure 2: Khmer, Contact Links, Wi-Fi & Notes */}
      <details className="ui-details rounded-xl border border-zinc-200 bg-white">
        <summary className="flex items-center justify-between px-5 py-3.5 text-[13.5px] font-medium text-zinc-900 hover:bg-[#FAFAFA] rounded-xl">
          <span>
            Khmer Name, Contacts, Wi-Fi &amp; Notes{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <ChevronDown
            className="ui-details-chevron h-4 w-4 text-zinc-400 transition-transform"
            strokeWidth={1.5}
          />
        </summary>

        <div className="grid grid-cols-1 gap-3.5 border-t border-zinc-200 p-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="opt-name-km"
              lang="km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Khmer venue name
            </label>
            <input
              id="opt-name-km"
              type="text"
              lang="km"
              value={tenant.nameKm}
              onChange={(e) => updateField("nameKm", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-hours"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Opening hours
            </label>
            <input
              id="opt-hours"
              type="text"
              value={tenant.meta.openingHours ?? ""}
              onChange={(e) => updateMeta("openingHours", e.target.value)}
              placeholder="Daily 11:00 – 23:00"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-tagline-en"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Tagline (EN)
            </label>
            <input
              id="opt-tagline-en"
              type="text"
              value={tenant.meta.taglineEn ?? tenant.meta.tagline ?? ""}
              onChange={(e) =>
                onDraftChange({
                  ...tenant,
                  meta: {
                    ...tenant.meta,
                    tagline: e.target.value,
                    taglineEn: e.target.value,
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-tagline-km"
              lang="km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Tagline (Khmer)
            </label>
            <input
              id="opt-tagline-km"
              type="text"
              lang="km"
              value={tenant.meta.taglineKm ?? ""}
              onChange={(e) => updateMeta("taglineKm", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-phone"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Phone
            </label>
            <input
              id="opt-phone"
              type="tel"
              value={tenant.meta.phone ?? ""}
              onChange={(e) => updateMeta("phone", e.target.value)}
              placeholder="+855 23 998 412"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] tabular-nums"
            />
          </div>
          <div>
            <label
              htmlFor="opt-telegram"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Telegram
            </label>
            <input
              id="opt-telegram"
              type="text"
              value={tenant.meta.telegramUrl ?? ""}
              onChange={(e) => updateMeta("telegramUrl", e.target.value)}
              placeholder="https://t.me/username"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-facebook"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Facebook Page
            </label>
            <input
              id="opt-facebook"
              type="text"
              value={tenant.meta.facebookUrl ?? ""}
              onChange={(e) => updateMeta("facebookUrl", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-maps"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Google Maps URL
            </label>
            <input
              id="opt-maps"
              type="text"
              value={tenant.meta.googleMapsUrl ?? ""}
              onChange={(e) => updateMeta("googleMapsUrl", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="opt-address"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Address
            </label>
            <input
              id="opt-address"
              type="text"
              value={tenant.meta.address ?? ""}
              onChange={(e) => updateMeta("address", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-wifi"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Wi-Fi network
            </label>
            <input
              id="opt-wifi"
              type="text"
              value={tenant.meta.wifiName ?? ""}
              onChange={(e) => updateMeta("wifiName", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-[12.5px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-wifi-pass"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Wi-Fi password
            </label>
            <input
              id="opt-wifi-pass"
              type="text"
              value={tenant.meta.wifiPassword ?? ""}
              onChange={(e) => updateMeta("wifiPassword", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-[12.5px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="opt-service"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Service / VAT disclaimer
            </label>
            <input
              id="opt-service"
              type="text"
              value={tenant.meta.serviceNote ?? ""}
              onChange={(e) => updateMeta("serviceNote", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-footer-en"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Footer note (EN)
            </label>
            <textarea
              id="opt-footer-en"
              rows={2}
              value={tenant.meta.footerNote ?? ""}
              onChange={(e) => updateMeta("footerNote", e.target.value)}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px]"
            />
          </div>
          <div>
            <label
              htmlFor="opt-footer-km"
              lang="km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Footer note (Khmer)
            </label>
            <textarea
              id="opt-footer-km"
              lang="km"
              rows={2}
              value={tenant.meta.footerNoteKm ?? ""}
              onChange={(e) => updateMeta("footerNoteKm", e.target.value)}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px]"
            />
          </div>
        </div>
      </details>

      {/* Clean Save Bar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3">
        <span className="text-[12px] text-zinc-500">
          Updates publish immediately to{" "}
          <code className="font-mono text-zinc-700">/m/{tenant.slug}</code>
        </span>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
