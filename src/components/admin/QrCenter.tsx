"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Grid2x2,
  Image as ImageIcon,
  Printer,
} from "lucide-react";
import { resolveLocalized } from "@/lib/i18n";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import {
  buildStyledQrDataUrl,
  buildStyledQrSvg,
} from "@/lib/qr";
import { computeThemeContrast } from "@/lib/theme";
import type { Locale, SerializedTenant } from "@/types/menu";

interface QrCenterProps {
  locale: Locale;
  tenant: SerializedTenant;
  onNotify: (text: string, tone?: "neutral" | "error") => void;
}

interface BatchQrItem {
  tableCode: string;
  url: string;
  dataUrl: string;
  svg: string;
}

const emptySubscribe = () => () => {};

async function downloadSvgAsPng(
  svgText: string,
  width: number,
  height: number,
  filename: string
): Promise<void> {
  const svgBlob = new Blob([svgText], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to render SVG"));
      el.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!pngBlob) throw new Error("PNG export failed");

    const pngUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function QrCenter({ locale, tenant, onNotify }: QrCenterProps) {
  const t = PORTAL_COPY[locale].admin;
  const c = PORTAL_COPY[locale].common;

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "http://localhost:3000"
  );
  const [tableCode, setTableCode] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadingQrPng, setDownloadingQrPng] = useState(false);
  const [downloadingCardPng, setDownloadingCardPng] = useState(false);

  // Batch generator state
  const [batchFrom, setBatchFrom] = useState(1);
  const [batchTo, setBatchTo] = useState(6);
  const [batchPrefix, setBatchPrefix] = useState("");
  const [batchQrs, setBatchQrs] = useState<BatchQrItem[]>([]);

  const contrast = useMemo(
    () => computeThemeContrast(tenant.primaryColor),
    [tenant.primaryColor]
  );

  const singleUrl = useMemo(() => {
    const clean = origin.replace(/\/+$/, "");
    const base = `${clean}/m/${tenant.slug}`;
    const trimmed = tableCode.trim();
    return trimmed ? `${base}?table=${encodeURIComponent(trimmed)}` : base;
  }, [origin, tenant.slug, tableCode]);

  const handleLabel = useMemo(() => {
    const trimmed = tableCode.trim();
    return trimmed ? `@${tenant.slug} · ${trimmed}` : `@${tenant.slug}`;
  }, [tenant.slug, tableCode]);

  const singleQrOptions = useMemo(
    () => ({
      darkHex: "#09090B",
      badgeHex: "#09090B",
      includeFrame: true,
      handleLabel,
    }),
    [handleLabel]
  );

  const singleDataUrl = useMemo(
    () => buildStyledQrDataUrl(singleUrl, singleQrOptions),
    [singleUrl, singleQrOptions]
  );

  const tableCardQrDataUrl = useMemo(
    () =>
      buildStyledQrDataUrl(singleUrl, {
        darkHex: "#09090B",
        badgeHex: contrast.primary,
        includeFrame: false,
      }),
    [singleUrl, contrast.primary]
  );

  const buildDownloadHref = (
    format: "svg" | "png" | "card",
    table?: string
  ) => {
    const params = new URLSearchParams({
      format,
      origin,
      locale,
    });
    if (table?.trim()) params.set("table", table.trim());
    return `/api/admin/qr?${params.toString()}`;
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(singleUrl);
      setCopiedUrl(true);
      onNotify(t.toastUrlCopied);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      onNotify(t.toastUrlCopyError, "error");
    }
  };

  const handleDownloadStyledQrPng = async (
    svgText: string,
    table?: string
  ) => {
    setDownloadingQrPng(true);
    try {
      const cleanTable = table?.trim().replace(/[^a-zA-Z0-9_-]/g, "");
      const suffix = cleanTable
        ? `${tenant.slug}-table-${cleanTable}`
        : tenant.slug;
      await downloadSvgAsPng(svgText, 1200, 1348, `qr-${suffix}.png`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : c.unknownError,
        "error"
      );
    } finally {
      setDownloadingQrPng(false);
    }
  };

  const handleDownloadCardPng = async () => {
    setDownloadingCardPng(true);
    try {
      const res = await fetch(buildDownloadHref("card", tableCode));
      if (!res.ok) throw new Error(c.unknownError);
      const svgText = await res.text();
      const cleanTable = tableCode.trim().replace(/[^a-zA-Z0-9_-]/g, "");
      const suffix = cleanTable
        ? `${tenant.slug}-table-${cleanTable}`
        : tenant.slug;
      await downloadSvgAsPng(
        svgText,
        1200,
        1560,
        `table-card-${suffix}.png`
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : c.unknownError,
        "error"
      );
    } finally {
      setDownloadingCardPng(false);
    }
  };

  const handleGenerateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const start = Math.max(1, Math.min(999, Math.floor(batchFrom)));
    const end = Math.max(start, Math.min(start + 29, Math.floor(batchTo)));

    try {
      const cleanOrigin = origin.replace(/\/+$/, "");
      const items: BatchQrItem[] = [];
      for (let num = start; num <= end; num++) {
        const padded = String(num).padStart(2, "0");
        const code = batchPrefix.trim()
          ? `${batchPrefix.trim()}-${padded}`
          : padded;
        const url = `${cleanOrigin}/m/${tenant.slug}?table=${encodeURIComponent(
          code
        )}`;
        const opts = {
          darkHex: "#09090B",
          badgeHex: "#09090B",
          includeFrame: true,
          handleLabel: `@${tenant.slug} · ${code}`,
        };
        const svg = buildStyledQrSvg(url, opts);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        items.push({ tableCode: code, url, dataUrl, svg });
      }
      setBatchQrs(items);
      onNotify(t.toastBatchQr(items.length));
    } catch {
      onNotify(t.toastBatchQrError, "error");
    }
  };

  const venueName = resolveLocalized(
    locale,
    tenant.nameKm,
    tenant.nameEn,
    tenant.name
  );
  const tagline = resolveLocalized(
    locale,
    tenant.meta.taglineKm,
    tenant.meta.taglineEn ?? tenant.meta.tagline,
    t.qrCardDefaultTagline
  );

  return (
    <div className="space-y-6">
      {/* Primary Single QR & Printable Table Card */}
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
            {t.qrTitle}
          </h2>
          <p className="text-[12px] text-zinc-500">{t.qrSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-2">
          {/* Controls & Telegram-Style QR Preview */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="qr-table-input"
                className="block text-[12px] font-medium text-zinc-700"
              >
                {t.qrTableLabel}
              </label>
              <input
                id="qr-table-input"
                type="text"
                maxLength={24}
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                placeholder={t.qrTablePlaceholder}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-[#FAFAFA] p-3">
              <span className="block text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                {t.qrEncodedUrl}
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-[12px] text-zinc-900">
                  {singleUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  aria-label={c.copy}
                  className="inline-flex h-7 items-center gap-1 rounded border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                      <span>{c.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" strokeWidth={1.5} />
                      <span>{c.copy}</span>
                    </>
                  )}
                </button>
                <a
                  href={singleUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t.liveMenu}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                </a>
              </div>
            </div>

            {/* Telegram-Style Standalone QR Showcase */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-center bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 px-6 py-7">
                <div className="w-[216px] overflow-hidden rounded-[26px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                  <img
                    src={singleDataUrl}
                    alt={`QR code for ${singleUrl}`}
                    className="block h-auto w-full"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-950">
                    {t.qrStandaloneTitle}
                  </p>
                  <p className="text-[11.5px] text-zinc-500">
                    {t.qrStandaloneDesc}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildDownloadHref("svg", tableCode)}
                    download
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 hover:bg-zinc-100"
                  >
                    <FileCode2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>{t.qrExportSvg}</span>
                  </a>
                  <button
                    type="button"
                    disabled={downloadingQrPng}
                    onClick={() =>
                      void handleDownloadStyledQrPng(
                        buildStyledQrSvg(singleUrl, singleQrOptions),
                        tableCode
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>
                      {downloadingQrPng ? t.qrExportingPng : t.qrExportPng}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Table-Card Preview */}
          <div className="flex flex-col items-center justify-between rounded-lg border border-zinc-200 bg-[#FAFAFA] p-4">
            <div className="w-full max-w-[280px] overflow-hidden rounded-3xl border border-zinc-200 bg-white text-center shadow-sm">
              <div
                className="h-2.5 w-full"
                style={{ backgroundColor: contrast.primary }}
              />
              <div className="px-5 py-6">
                {tenant.logoUrl && (
                  <img
                    src={tenant.logoUrl}
                    alt=""
                    className="mx-auto mb-2.5 h-8 w-8 rounded border border-zinc-200 object-contain p-0.5"
                  />
                )}
                <p className="truncate text-[16px] font-bold tracking-[-0.02em] text-zinc-950">
                  {venueName}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {tagline}
                </p>

                <div className="mt-3">
                  <span
                    className="inline-block rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{
                      backgroundColor: contrast.primary,
                      color: contrast.foreground,
                    }}
                  >
                    {tableCode.trim()
                      ? t.qrCardTableBadge(tableCode.trim())
                      : t.qrCardScanBadge}
                  </span>
                </div>

                <div className="mx-auto mt-4 w-44 overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white p-2 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                  <img
                    src={tableCardQrDataUrl}
                    alt="Table card QR"
                    className="h-full w-full object-contain"
                  />
                </div>

                <p className="mt-4 text-[12px] font-semibold text-zinc-800">
                  {t.qrCardInstruction}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <a
                href={buildDownloadHref("card", tableCode)}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 hover:bg-zinc-100"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{t.qrDownloadCardSvg}</span>
              </a>
              <button
                type="button"
                disabled={downloadingCardPng}
                onClick={() => void handleDownloadCardPng()}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>
                  {downloadingCardPng ? t.qrExportingPng : t.qrDownloadCardPng}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Batch Table QR Generator */}
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              {t.qrBatchTitle}
            </h2>
            <p className="text-[12px] text-zinc-500">{t.qrBatchSubtitle}</p>
          </div>
          {batchQrs.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 hover:bg-zinc-100"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{t.qrPrintSheet}</span>
            </button>
          )}
        </div>

        <form
          onSubmit={handleGenerateBatch}
          className="flex flex-wrap items-end gap-3 border-b border-zinc-200 bg-[#FAFAFA] px-4 py-3.5"
        >
          <div>
            <label
              htmlFor="batch-prefix"
              className="block text-[11px] font-medium text-zinc-600"
            >
              {t.qrPrefixLabel}
            </label>
            <input
              id="batch-prefix"
              type="text"
              maxLength={12}
              value={batchPrefix}
              onChange={(e) => setBatchPrefix(e.target.value)}
              placeholder="T / PATIO"
              className="mt-1 w-32 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="batch-from"
              className="block text-[11px] font-medium text-zinc-600"
            >
              {t.qrStartNum}
            </label>
            <input
              id="batch-from"
              type="number"
              min={1}
              max={999}
              value={batchFrom}
              onChange={(e) => setBatchFrom(Number(e.target.value))}
              className="mt-1 w-24 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums text-zinc-950 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="batch-to"
              className="block text-[11px] font-medium text-zinc-600"
            >
              {t.qrEndNum}
            </label>
            <input
              id="batch-to"
              type="number"
              min={1}
              max={999}
              value={batchTo}
              onChange={(e) => setBatchTo(Number(e.target.value))}
              className="mt-1 w-24 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] tabular-nums text-zinc-950 focus:border-brand focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-90"
          >
            <Grid2x2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{t.qrGenerateBatch}</span>
          </button>
        </form>

        {batchQrs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {batchQrs.map((entry) => (
              <div
                key={entry.tableCode}
                className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-900 p-3 text-center"
              >
                <div className="w-full max-w-[144px] overflow-hidden rounded-2xl bg-white shadow-sm">
                  <img
                    src={entry.dataUrl}
                    alt={`QR for table ${entry.tableCode}`}
                    className="block h-auto w-full"
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <a
                    href={buildDownloadHref("svg", entry.tableCode)}
                    download
                    className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/20"
                  >
                    SVG
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadStyledQrPng(entry.svg, entry.tableCode)
                    }
                    className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/20"
                  >
                    PNG
                  </button>
                  <a
                    href={buildDownloadHref("card", entry.tableCode)}
                    download
                    className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/20"
                  >
                    {t.qrCardBtn}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-zinc-500">
            {t.qrBatchEmpty}
          </div>
        )}
      </section>
    </div>
  );
}
