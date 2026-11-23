"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
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
import { computeThemeContrast } from "@/lib/theme";
import type { SerializedTenant } from "@/types/menu";

interface QrCenterProps {
  tenant: SerializedTenant;
  onNotify: (text: string, tone?: "neutral" | "error") => void;
}

interface BatchQrItem {
  tableCode: string;
  url: string;
  dataUrl: string;
}

const emptySubscribe = () => () => {};

export function QrCenter({ tenant, onNotify }: QrCenterProps) {
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "http://localhost:3000"
  );
  const [tableCode, setTableCode] = useState("");
  const [singleDataUrl, setSingleDataUrl] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Batch generator state
  const [batchFrom, setBatchFrom] = useState(1);
  const [batchTo, setBatchTo] = useState(6);
  const [batchPrefix, setBatchPrefix] = useState("");
  const [batchQrs, setBatchQrs] = useState<BatchQrItem[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);

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

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(singleUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 520,
      color: { dark: "#09090B", light: "#FFFFFF" },
    }).then((url) => {
      if (active) setSingleDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [singleUrl]);

  const buildDownloadHref = (
    format: "svg" | "png" | "card",
    table?: string
  ) => {
    const params = new URLSearchParams({
      format,
      origin,
    });
    if (table?.trim()) params.set("table", table.trim());
    return `/api/admin/qr?${params.toString()}`;
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(singleUrl);
      setCopiedUrl(true);
      onNotify("Menu URL copied to clipboard");
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      onNotify("Unable to copy URL", "error");
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = Math.max(1, Math.min(999, Math.floor(batchFrom)));
    const end = Math.max(start, Math.min(start + 29, Math.floor(batchTo)));
    setGeneratingBatch(true);

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
        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 360,
          color: { dark: "#09090B", light: "#FFFFFF" },
        });
        items.push({ tableCode: code, url, dataUrl });
      }
      setBatchQrs(items);
      onNotify(`Generated ${items.length} table QR codes`);
    } catch {
      onNotify("Could not generate batch QR codes", "error");
    } finally {
      setGeneratingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Single QR & Printable Table Card */}
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
            QR Code Center
          </h2>
          <p className="text-[12px] text-zinc-500">
            Print-ready vector SVG, high-DPI PNG (1200px), and branded table
            cards pointing straight to your menu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-2">
          {/* Controls & Raw QR Export */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="qr-table-input"
                className="block text-[12px] font-medium text-zinc-700"
              >
                Optional table code
              </label>
              <input
                id="qr-table-input"
                type="text"
                maxLength={24}
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                placeholder="e.g. 04 or PATIO-2 (leave empty for general menu)"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-zinc-200 bg-[#FAFAFA] p-3">
              <span className="block text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                Encoded destination URL
              </span>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-[12px] text-zinc-900">
                  {singleUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  aria-label="Copy menu URL"
                  className="inline-flex h-7 items-center gap-1 rounded border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" strokeWidth={1.5} />
                      Copy
                    </>
                  )}
                </button>
                <a
                  href={singleUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Test live menu link"
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                </a>
              </div>
            </div>

            {/* Crisp Standalone QR Preview */}
            <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4">
              <div className="h-32 w-32 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white p-1.5">
                {singleDataUrl ? (
                  <img
                    src={singleDataUrl}
                    alt={`QR code for ${singleUrl}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-100" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[13px] font-semibold text-zinc-950">
                  Standalone QR Code
                </p>
                <p className="text-[12px] text-zinc-500">
                  High error correction (Level H) for crisp scanning on menus,
                  stickers, and counter stands.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={buildDownloadHref("svg", tableCode)}
                    download
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 hover:bg-zinc-100"
                  >
                    <FileCode2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Export SVG
                  </a>
                  <a
                    href={buildDownloadHref("png", tableCode)}
                    download
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90"
                  >
                    <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    High-DPI PNG
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Table-Card Preview */}
          <div className="flex flex-col items-center justify-between rounded-lg border border-zinc-200 bg-[#FAFAFA] p-4">
            <div className="w-full max-w-[270px] overflow-hidden rounded-xl border border-zinc-200 bg-white text-center">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: contrast.primary }}
              />
              <div className="px-5 py-5">
                {tenant.logoUrl && (
                  <img
                    src={tenant.logoUrl}
                    alt=""
                    className="mx-auto mb-2.5 h-8 w-8 rounded border border-zinc-200 object-contain p-0.5"
                  />
                )}
                <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-zinc-950">
                  {tenant.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {tenant.meta.tagline || "Digital Menu"}
                </p>

                <div className="mt-3">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      backgroundColor: contrast.primary,
                      color: contrast.foreground,
                    }}
                  >
                    {tableCode.trim()
                      ? `Table ${tableCode.trim()}`
                      : "Scan for menu"}
                  </span>
                </div>

                <div className="mx-auto mt-3.5 w-40 rounded-lg border border-zinc-200 bg-white p-2">
                  {singleDataUrl ? (
                    <img
                      src={singleDataUrl}
                      alt="Table card QR"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-zinc-100" />
                  )}
                </div>

                <p className="mt-3 text-[11px] font-medium text-zinc-700">
                  Point your camera to browse
                </p>
                <p className="mt-1 truncate font-mono text-[10px] text-zinc-400">
                  /m/{tenant.slug}
                  {tableCode.trim() ? `?table=${tableCode.trim()}` : ""}
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
                Download Table Card (SVG)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Batch Table QR Generator */}
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              Batch Table QR Generator
            </h2>
            <p className="text-[12px] text-zinc-500">
              Generate table-tagged links (<code className="font-mono">?table=01</code>) for table analytics and printing.
            </p>
          </div>
          {batchQrs.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-900 hover:bg-zinc-100"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
              Print sheet
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => void handleGenerateBatch(e)}
          className="flex flex-wrap items-end gap-3 border-b border-zinc-200 bg-[#FAFAFA] px-4 py-3.5"
        >
          <div>
            <label
              htmlFor="batch-prefix"
              className="block text-[11px] font-medium text-zinc-600"
            >
              Prefix (optional)
            </label>
            <input
              id="batch-prefix"
              type="text"
              maxLength={12}
              value={batchPrefix}
              onChange={(e) => setBatchPrefix(e.target.value)}
              placeholder="e.g. T or PATIO"
              className="mt-1 w-32 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="batch-from"
              className="block text-[11px] font-medium text-zinc-600"
            >
              Start #
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
              End # (max 30)
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
            disabled={generatingBatch}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Grid2x2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {generatingBatch ? "Generating..." : "Generate batch"}
          </button>
        </form>

        {batchQrs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {batchQrs.map((entry) => (
              <div
                key={entry.tableCode}
                className="flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-3 text-center"
              >
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider tabular-nums"
                  style={{
                    backgroundColor: contrast.primary,
                    color: contrast.foreground,
                  }}
                >
                  Table {entry.tableCode}
                </span>
                <img
                  src={entry.dataUrl}
                  alt={`QR for table ${entry.tableCode}`}
                  className="mt-2.5 h-28 w-28 object-contain"
                />
                <div className="mt-2.5 flex items-center gap-1.5">
                  <a
                    href={buildDownloadHref("svg", entry.tableCode)}
                    download
                    className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    SVG
                  </a>
                  <a
                    href={buildDownloadHref("png", entry.tableCode)}
                    download
                    className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    PNG
                  </a>
                  <a
                    href={buildDownloadHref("card", entry.tableCode)}
                    download
                    className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    Card
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-zinc-500">
            Choose a table number range above to generate printable batch QR
            cards.
          </div>
        )}
      </section>
    </div>
  );
}
