import QRCode from "qrcode";
import { computeThemeContrast } from "@/lib/theme";

export function buildMenuUrl(
  origin: string,
  slug: string,
  tableCode?: string
): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const base = `${cleanOrigin}/m/${encodeURIComponent(slug)}`;
  const trimmedTable = tableCode?.trim();
  if (!trimmedTable) return base;
  return `${base}?table=${encodeURIComponent(trimmedTable)}`;
}

export async function generateQrSvg(
  url: string,
  darkHex = "#09090B"
): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: darkHex,
      light: "#FFFFFF",
    },
  });
}

export async function generateQrPngBuffer(
  url: string,
  width = 1200,
  darkHex = "#09090B"
): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width,
    color: {
      dark: darkHex,
      light: "#FFFFFF",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates a print-ready Swiss minimalist table-tent card as an SVG
 * adhering strictly to the tenant's 80/20 neutral grayscale + primary color system.
 */
export async function generatePrintableTableCardSvg(options: {
  venueName: string;
  tagline?: string;
  url: string;
  primaryColor: string;
  tableCode?: string;
}): Promise<string> {
  const contrast = computeThemeContrast(options.primaryColor);
  const qrSvgRaw = await QRCode.toString(options.url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: "#09090B",
      light: "#FFFFFF",
    },
  });

  // Extract inner SVG path and viewBox from qrcode output
  const viewBoxMatch = /viewBox="([^"]+)"/.exec(qrSvgRaw);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 41 41";
  const innerSvg = qrSvgRaw
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "");

  const venueNameEsc = escapeXml(options.venueName.slice(0, 36));
  const taglineEsc = escapeXml((options.tagline ?? "Digital Menu").slice(0, 48));
  const tableLabel = options.tableCode?.trim()
    ? `TABLE ${escapeXml(options.tableCode.trim().toUpperCase())}`
    : "SCAN FOR MENU";

  const displayUrl = escapeXml(
    options.url.replace(/^https?:\/\//, "").slice(0, 44)
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840">
  <rect width="600" height="840" fill="#FFFFFF" />
  <rect x="24" y="24" width="552" height="792" rx="12" fill="#FAFAFA" stroke="#E4E4E7" stroke-width="2" />
  <!-- Top brand accent hairline -->
  <rect x="24" y="24" width="552" height="10" rx="2" fill="${contrast.primary}" />

  <!-- Venue Identity -->
  <text x="300" y="108" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="30" font-weight="600" letter-spacing="-0.6" fill="#09090B">${venueNameEsc}</text>
  <text x="300" y="142" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="400" fill="#71717A">${taglineEsc}</text>

  <!-- Table / Action Badge (20% accent allocation) -->
  <rect x="200" y="176" width="200" height="36" rx="18" fill="${contrast.primary}" />
  <text x="300" y="199" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" letter-spacing="1.4" fill="${contrast.foreground}">${tableLabel}</text>

  <!-- QR Frame -->
  <rect x="116" y="248" width="368" height="368" rx="10" fill="#FFFFFF" stroke="#E4E4E7" stroke-width="2" />
  <svg x="136" y="268" width="328" height="328" viewBox="${viewBox}">
    ${innerSvg}
  </svg>

  <!-- Instructions -->
  <text x="300" y="672" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="17" font-weight="500" fill="#18181B">Point your camera to browse the menu</text>
  <line x1="180" y1="712" x2="420" y2="712" stroke="#E4E4E7" stroke-width="1.5" />
  <text x="300" y="752" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="#71717A">${displayUrl}</text>
</svg>`;
}
