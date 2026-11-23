"use client";

import { useMemo, useState } from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { NativeSelect } from "@/components/ui/NativeSelect";
import {
  computeThemeContrast,
  CURATED_THEME_PRESETS,
  SUPPORTED_CURRENCIES,
} from "@/lib/theme";
import { slugify } from "@/lib/validation";
import type {
  ScanAnalyticsRow,
  SuperAdminTenantSummary,
  VendorMode,
} from "@/types/menu";

interface ProvisionTenantModalProps {
  open: boolean;
  onClose: () => void;
  onProvisioned: (dashboard: {
    tenants: SuperAdminTenantSummary[];
    analytics: ScanAnalyticsRow[];
    totals: {
      totalTenants: number;
      activeTenants: number;
      suspendedTenants: number;
      totalItems: number;
      totalScans: number;
      scansLast7Days: number;
    };
  }) => void;
}

function ProvisionTenantForm({
  onClose,
  onProvisioned,
}: Omit<ProvisionTenantModalProps, "open">) {
  const [name, setName] = useState("");
  const [nameKm, setNameKm] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [vendorMode, setVendorMode] = useState<VendorMode>("CART");
  const [primaryColor, setPrimaryColor] = useState("#1E293B");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
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
          name,
          nameKm,
          slug,
          tagline,
          currency,
          vendorMode,
          primaryColor,
          ownerName,
          ownerEmail,
          ownerPassword,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        dashboard?: Parameters<ProvisionTenantModalProps["onProvisioned"]>[0];
      };
      if (!res.ok || !json.dashboard) {
        throw new Error(json.error ?? "Failed to provision venue");
      }
      onProvisioned(json.dashboard);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create venue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-5">
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          1. Venue Identity
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prov-name"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Venue name (English)
            </label>
            <input
              id="prov-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Koh Kong Grill"
              autoFocus
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="prov-name-km"
              lang="km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Venue name (Khmer / ខ្មែរ)
            </label>
            <input
              id="prov-name-km"
              type="text"
              lang="km"
              maxLength={80}
              value={nameKm}
              onChange={(e) => setNameKm(e.target.value)}
              placeholder="ឧ. គ្រឿងសមុទ្រកោះកុង"
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prov-slug"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Public menu slug
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
                placeholder="atelier-ramen"
                className="w-full rounded-r-md border-l border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prov-currency"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Currency
            </label>
            <div className="mt-1.5">
              <NativeSelect
                id="prov-currency"
                value={currency}
                onChange={setCurrency}
                fullWidth
                options={SUPPORTED_CURRENCIES.map((c) => ({
                  value: c.code,
                  label: c.label,
                }))}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prov-color"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Primary accent ({contrast.selectedContrast.toFixed(1)}:1{" "}
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
                    aria-label={`Select ${preset.name}`}
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
              Vendor storefront mode
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
                Add to Cart Mode
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
                Product Listing Only
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prov-tagline"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Short tagline (optional)
            </label>
            <input
              id="prov-tagline"
              type="text"
              maxLength={120}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Hand-pulled noodles & seasonal sake"
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3.5 border-t border-zinc-200 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          2. Menu Admin Account
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="prov-owner-name"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Owner name
            </label>
            <input
              id="prov-owner-name"
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Sora Takahashi"
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="prov-owner-email"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Owner email
            </label>
            <input
              id="prov-owner-email"
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@atelierramen.com"
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="prov-owner-pass"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Initial password
            </label>
            <input
              id="prov-owner-pass"
              type="password"
              required
              minLength={8}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Provisioning..." : "Create venue"}
        </button>
      </div>
    </form>
  );
}

export function ProvisionTenantModal({
  open,
  onClose,
  onProvisioned,
}: ProvisionTenantModalProps) {
  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Provision New Venue"
      subtitle="Creates an isolated tenant workspace, public /m/[slug] menu, and Menu Admin login."
      maxWidthClass="max-w-lg"
    >
      {open && (
        <ProvisionTenantForm onClose={onClose} onProvisioned={onProvisioned} />
      )}
    </NativeDialog>
  );
}
