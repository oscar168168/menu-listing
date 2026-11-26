"use client";

import { useMemo, useState } from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import {
  computeThemeContrast,
  CURATED_THEME_PRESETS,
} from "@/lib/theme";
import { slugify } from "@/lib/slug";
import type {
  Locale,
  ScanAnalyticsRow,
  SuperAdminTenantSummary,
  VendorMode,
} from "@/types/menu";

interface ProvisionTenantModalProps {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onProvisioned: (created: {
    summary: SuperAdminTenantSummary;
    analyticsRow: ScanAnalyticsRow;
  }) => void;
}

function ProvisionTenantForm({
  locale,
  onClose,
  onProvisioned,
}: Omit<ProvisionTenantModalProps, "open">) {
  const t = PORTAL_COPY[locale].superAdmin;
  const c = PORTAL_COPY[locale].common;

  const [nameKm, setNameKm] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [taglineKm, setTaglineKm] = useState("");
  const [tagline, setTagline] = useState("");
  const [currency, setCurrency] = useState("KHR");
  const [vendorMode, setVendorMode] = useState<VendorMode>("CART");
  const [primaryColor, setPrimaryColor] = useState("#1E293B");
  const [ownerName, setOwnerName] = useState("");
  const [ownerLogin, setOwnerLogin] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contrast = useMemo(
    () => computeThemeContrast(primaryColor),
    [primaryColor]
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKm,
          name: name || nameKm,
          slug,
          taglineKm,
          tagline: tagline || taglineKm,
          currency,
          vendorMode,
          primaryColor,
          ownerName,
          ownerUsername: ownerLogin,
          ownerPhone: ownerLogin,
          ownerEmail: ownerLogin,
          ownerPassword,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        summary?: SuperAdminTenantSummary;
        analyticsRow?: ScanAnalyticsRow;
      };
      if (!res.ok || !json.summary || !json.analyticsRow) {
        throw new Error(json.error ?? t.toastProvisionError);
      }
      onProvisioned({
        summary: json.summary,
        analyticsRow: json.analyticsRow,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.toastProvisionError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      lang={locale}
      onSubmit={(e) => void handleSubmit(e)}
      className="p-5 space-y-5"
    >
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          {t.provisionStep1}
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prov-name-km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionNameKmLabel}
            </label>
            <input
              id="prov-name-km"
              type="text"
              lang="km"
              required={!name.trim()}
              maxLength={80}
              value={nameKm}
              onChange={(e) => setNameKm(e.target.value)}
              placeholder={t.provisionNameKmPlaceholder}
              autoFocus
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="prov-name"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionNameEnLabel}
            </label>
            <input
              id="prov-name"
              type="text"
              required={!nameKm.trim()}
              maxLength={80}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t.provisionNameEnPlaceholder}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prov-slug"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionSlugLabel}
            </label>
            <div className="mt-1.5 flex items-center rounded-md border border-zinc-200 bg-[#FAFAFA] focus-within:border-zinc-950">
              <span className="px-3 font-mono text-[13px] text-zinc-500">
                /m/
              </span>
              <input
                id="prov-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                placeholder="koh-kong-grill"
                className="w-full rounded-r-md border-l border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prov-currency"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionCurrencyLabel}
            </label>
            <div className="mt-1.5">
              <NativeSelect
                id="prov-currency"
                value={currency}
                onChange={setCurrency}
                fullWidth
                options={[
                  { value: "KHR", label: c.currencyKhrLabel },
                  { value: "USD", label: c.currencyUsdLabel },
                ]}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prov-color"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionColorLabel} ({contrast.selectedContrast.toFixed(1)}:1{" "}
              {contrast.rating})
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="prov-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-9 w-10 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
              />
              <div className="flex flex-wrap gap-1">
                {CURATED_THEME_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    aria-label={preset.name}
                    className={`h-6 w-6 rounded border ${
                      primaryColor === preset.hex
                        ? "border-zinc-950 ring-1 ring-zinc-950"
                        : "border-black/15"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-[12px] font-medium text-zinc-700">
              {t.provisionModeLabel}
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVendorMode("CART")}
                className={`rounded-md border px-3 py-2 text-[12px] font-medium transition-colors ${
                  vendorMode === "CART"
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {c.addToCart}
              </button>
              <button
                type="button"
                onClick={() => setVendorMode("LISTING_ONLY")}
                className={`rounded-md border px-3 py-2 text-[12px] font-medium transition-colors ${
                  vendorMode === "LISTING_ONLY"
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {c.listingOnly}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="prov-tagline-km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionTaglineKmLabel}
            </label>
            <input
              id="prov-tagline-km"
              type="text"
              lang="km"
              maxLength={120}
              value={taglineKm}
              onChange={(e) => setTaglineKm(e.target.value)}
              placeholder={t.provisionTaglineKmPlaceholder}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="prov-tagline"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionTaglineEnLabel}
            </label>
            <input
              id="prov-tagline"
              type="text"
              maxLength={120}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={t.provisionTaglineEnPlaceholder}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3.5 border-t border-zinc-200 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          {t.provisionStep2}
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prov-owner-name"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionOwnerNameLabel}
            </label>
            <input
              id="prov-owner-name"
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder={t.provisionOwnerNamePlaceholder}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="prov-owner-login"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionOwnerLoginLabel}
            </label>
            <input
              id="prov-owner-login"
              type="text"
              required
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={ownerLogin}
              onChange={(e) => setOwnerLogin(e.target.value)}
              placeholder={t.provisionOwnerLoginPlaceholder}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prov-owner-pass"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.provisionOwnerPassLabel}
            </label>
            <input
              id="prov-owner-pass"
              type="password"
              required
              minLength={6}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder={t.provisionOwnerPassPlaceholder}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
        >
          {c.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? t.provisionSubmitting : t.provisionSubmit}
        </button>
      </div>
    </form>
  );
}

export function ProvisionTenantModal({
  open,
  locale,
  onClose,
  onProvisioned,
}: ProvisionTenantModalProps) {
  const t = PORTAL_COPY[locale].superAdmin;
  const c = PORTAL_COPY[locale].common;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={t.provisionTitle}
      subtitle={t.provisionSubtitle}
      closeLabel={c.closeDialog}
      maxWidthClass="max-w-lg"
    >
      {open && (
        <ProvisionTenantForm
          locale={locale}
          onClose={onClose}
          onProvisioned={onProvisioned}
        />
      )}
    </NativeDialog>
  );
}
