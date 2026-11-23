"use client";

import { useState } from "react";
import {
  Clock,
  MapPin,
  Phone,
  Wifi,
  Check,
  Copy,
  Send,
  Globe,
  ExternalLink,
} from "lucide-react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { resolveLocalized, UI_COPY } from "@/lib/i18n";
import type { Locale, SerializedTenant } from "@/types/menu";

interface VenueInfoSheetProps {
  open: boolean;
  onClose: () => void;
  tenant: SerializedTenant;
  locale: Locale;
}

function normalizeExternalHref(raw?: string): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://t.me/${trimmed.slice(1)}`;
  }
  return `https://${trimmed}`;
}

export function VenueInfoSheet({
  open,
  onClose,
  tenant,
  locale,
}: VenueInfoSheetProps) {
  const [copiedWifi, setCopiedWifi] = useState(false);
  const { meta } = tenant;
  const t = UI_COPY[locale];

  const venueName = resolveLocalized(
    locale,
    tenant.nameKm,
    tenant.nameEn,
    tenant.name
  );
  const tagline = resolveLocalized(
    locale,
    meta.taglineKm,
    meta.taglineEn ?? meta.tagline
  );
  const footerNote = resolveLocalized(
    locale,
    meta.footerNoteKm,
    meta.footerNote
  );

  const telegramHref = normalizeExternalHref(meta.telegramUrl);
  const facebookHref = normalizeExternalHref(meta.facebookUrl);
  const mapsHref = normalizeExternalHref(meta.googleMapsUrl);

  const handleCopyWifi = async () => {
    if (!meta.wifiPassword) return;
    try {
      await navigator.clipboard.writeText(meta.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      variant="sheet"
      lightDismiss={true}
      title={venueName}
      subtitle={tagline || t.hoursAndInfo}
    >
      <div lang={locale} className="px-5 py-4 space-y-4">
        {meta.openingHours && (
          <div className="flex items-start gap-3">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                {t.hours}
              </p>
              <p className="mt-0.5 text-[14px] text-zinc-900">
                {meta.openingHours}
              </p>
            </div>
          </div>
        )}

        {(meta.address || mapsHref) && (
          <div className="flex items-start gap-3">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                {t.location}
              </p>
              {meta.address && (
                <p className="mt-0.5 text-[14px] text-zinc-900">
                  {meta.address}
                </p>
              )}
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950"
                >
                  {t.openMaps}
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>
        )}

        {(meta.phone || telegramHref || facebookHref) && (
          <div className="flex items-start gap-3">
            <Phone
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
              strokeWidth={1.5}
            />
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                {t.contact}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {meta.phone && (
                  <a
                    href={`tel:${meta.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-medium tabular-nums text-zinc-900 hover:bg-zinc-100"
                  >
                    <Phone className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                    {meta.phone}
                  </a>
                )}
                {telegramHref && (
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-zinc-900 hover:bg-zinc-100"
                  >
                    <Send className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                    {t.telegram}
                  </a>
                )}
                {facebookHref && (
                  <a
                    href={facebookHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-zinc-900 hover:bg-zinc-100"
                  >
                    <Globe className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                    {t.facebook}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {(meta.wifiName || meta.wifiPassword) && (
          <div className="rounded-lg border border-zinc-200 bg-[#FAFAFA] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-600">
                <Wifi className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{t.guestWifi}</span>
              </div>
              {meta.wifiPassword && (
                <button
                  type="button"
                  onClick={() => void handleCopyWifi()}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  {copiedWifi ? (
                    <>
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                      {t.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" strokeWidth={1.5} />
                      {t.copyPassword}
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
              {meta.wifiName && (
                <div>
                  <span className="block text-[11px] text-zinc-500">
                    {t.network}
                  </span>
                  <span className="font-mono font-medium text-zinc-900">
                    {meta.wifiName}
                  </span>
                </div>
              )}
              {meta.wifiPassword && (
                <div>
                  <span className="block text-[11px] text-zinc-500">
                    {t.password}
                  </span>
                  <span className="font-mono font-medium text-zinc-900">
                    {meta.wifiPassword}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {(meta.serviceNote || footerNote) && (
          <div className="border-t border-zinc-200 pt-3 space-y-1">
            {meta.serviceNote && (
              <p className="text-[12px] font-medium text-zinc-700">
                {meta.serviceNote}
              </p>
            )}
            {footerNote && (
              <p className="text-[13px] text-zinc-500">{footerNote}</p>
            )}
          </div>
        )}
      </div>
    </NativeDialog>
  );
}
