import QRCode from "qrcode";
import { computeThemeContrast } from "@/lib/theme";

export interface StyledQrOptions {
  darkHex?: string;
  badgeHex?: string;
  handleLabel?: string;
  includeFrame?: boolean;
}

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function roundNum(val: number): string {
  return Number(val.toFixed(3)).toString();
}

function isFinderModule(r: number, c: number, size: number): boolean {
  return (
    (r < 7 && c < 7) ||
    (r < 7 && c >= size - 7) ||
    (r >= size - 7 && c < 7)
  );
}

/**
 * Builds a single SVG path string for one QR cell with rounded exposed corners
 * and flush edges wherever adjacent orthogonal neighbors connect.
 */
function buildConnectedCellSubpath(
  col: number,
  row: number,
  hasTop: boolean,
  hasRight: boolean,
  hasBottom: boolean,
  hasLeft: boolean
): string {
  const flush = 0.015;
  const gap = 0.035;

  const x0 = hasLeft ? col - flush : col + gap;
  const x1 = hasRight ? col + 1 + flush : col + 1 - gap;
  const y0 = hasTop ? row - flush : row + gap;
  const y1 = hasBottom ? row + 1 + flush : row + 1 - gap;

  const w = x1 - x0;
  const h = y1 - y0;
  const maxR = Math.min(w, h) * 0.48;

  const rTL = !hasTop && !hasLeft ? maxR : 0;
  const rTR = !hasTop && !hasRight ? maxR : 0;
  const rBR = !hasBottom && !hasRight ? maxR : 0;
  const rBL = !hasBottom && !hasLeft ? maxR : 0;

  const sx = roundNum(x0 + rTL);
  const sy = roundNum(y0);

  let d = `M${sx} ${sy}`;
  d += `H${roundNum(x1 - rTR)}`;
  if (rTR > 0) {
    d += `Q${roundNum(x1)} ${roundNum(y0)} ${roundNum(x1)} ${roundNum(y0 + rTR)}`;
  }
  d += `V${roundNum(y1 - rBR)}`;
  if (rBR > 0) {
    d += `Q${roundNum(x1)} ${roundNum(y1)} ${roundNum(x1 - rBR)} ${roundNum(y1)}`;
  }
  d += `H${roundNum(x0 + rBL)}`;
  if (rBL > 0) {
    d += `Q${roundNum(x0)} ${roundNum(y1)} ${roundNum(x0)} ${roundNum(y1 - rBL)}`;
  }
  d += `V${roundNum(y0 + rTL)}`;
  if (rTL > 0) {
    d += `Q${roundNum(x0)} ${roundNum(y0)} ${roundNum(x0 + rTL)} ${roundNum(y0)}`;
  }
  return `${d}Z`;
}

function buildRoundedFinderEye(x: number, y: number, fillHex: string): string {
  // Smooth outer ring (7x7 minus 5x5 cutout using evenodd) + rounded 3x3 center core
  const outer = `M${x + 2.15} ${y}H${x + 4.85}A2.15 2.15 0 0 1 ${x + 7} ${y + 2.15}V${y + 4.85}A2.15 2.15 0 0 1 ${x + 4.85} ${y + 7}H${x + 2.15}A2.15 2.15 0 0 1 ${x} ${y + 4.85}V${y + 2.15}A2.15 2.15 0 0 1 ${x + 2.15} ${y}Z`;
  const inner = `M${x + 2.35} ${y + 1}H${x + 4.65}A1.35 1.35 0 0 1 ${x + 6} ${y + 2.35}V${y + 4.65}A1.35 1.35 0 0 1 ${x + 4.65} ${y + 6}H${x + 2.35}A1.35 1.35 0 0 1 ${x + 1} ${y + 4.65}V${y + 2.35}A1.35 1.35 0 0 1 ${x + 2.35} ${y + 1}Z`;
  return `<path d="${outer}${inner}" fill="${fillHex}" fill-rule="evenodd" /><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.95" fill="${fillHex}" />`;
}

/**
 * Generates an inner SVG layer with Telegram-style connected rounded QR dots,
 * rounded finder eyes, and a clean center circular dining badge (Error Correction H).
 */
export function buildStyledQrMatrixSvg(
  url: string,
  options: { darkHex?: string; badgeHex?: string } = {}
): { viewBox: string; matrixSize: number; innerSvg: string } {
  const darkHex = computeThemeContrast(options.darkHex ?? "#09090B").primary;
  const badgeHex = computeThemeContrast(options.badgeHex ?? darkHex).primary;
  const badgeFg = computeThemeContrast(badgeHex).foreground;

  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const center = n / 2;
  const clearRadius = n * 0.145;

  const isDataActive = (r: number, c: number): boolean => {
    if (r < 0 || r >= n || c < 0 || c >= n) return false;
    if (isFinderModule(r, c, n)) return false;
    const dist = Math.hypot(c + 0.5 - center, r + 0.5 - center);
    if (dist < clearRadius) return false;
    return Boolean(qr.modules.get(r, c));
  };

  let dataPath = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isDataActive(r, c)) continue;
      dataPath += buildConnectedCellSubpath(
        c,
        r,
        isDataActive(r - 1, c),
        isDataActive(r, c + 1),
        isDataActive(r + 1, c),
        isDataActive(r, c - 1)
      );
    }
  }

  const eyes =
    buildRoundedFinderEye(0, 0, darkHex) +
    buildRoundedFinderEye(n - 7, 0, darkHex) +
    buildRoundedFinderEye(0, n - 7, darkHex);

  const badgeRadius = clearRadius * 0.78;
  const iconScale = (badgeRadius * 1.15) / 24;
  const iconOffset = roundNum(center - 12 * iconScale);
  const badge = `
    <circle cx="${roundNum(center)}" cy="${roundNum(center)}" r="${roundNum(badgeRadius)}" fill="${badgeHex}" />
    <g transform="translate(${iconOffset}, ${iconOffset}) scale(${roundNum(iconScale)})" fill="none" stroke="${badgeFg}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    </g>
  `;

  return {
    viewBox: `0 0 ${n} ${n}`,
    matrixSize: n,
    innerSvg: `${eyes}<path d="${dataPath}" fill="${darkHex}" />${badge}`,
  };
}

/**
 * Generates a standalone Telegram-style QR SVG (rounded white card + connected rounded dots
 * + circular center badge + optional @handle / table label underneath).
 */
export function buildStyledQrSvg(
  url: string,
  options: StyledQrOptions | string = {}
): string {
  const opts: StyledQrOptions =
    typeof options === "string" ? { darkHex: options } : options;
  const darkHex = computeThemeContrast(opts.darkHex ?? "#09090B").primary;
  const { viewBox, innerSvg } = buildStyledQrMatrixSvg(url, {
    darkHex,
    badgeHex: opts.badgeHex ?? darkHex,
  });

  const cleanLabel = opts.handleLabel?.trim();
  if (opts.includeFrame && cleanLabel) {
    const labelEsc = escapeXml(cleanLabel.toUpperCase().slice(0, 30));
    const width = 520;
    const height = 584;
    const qrSize = 408;
    const qrX = (width - qrSize) / 2;
    const qrY = 52;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="48" fill="#FFFFFF" />
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${viewBox}">
    ${innerSvg}
  </svg>
  <text x="${width / 2}" y="520" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="25" font-weight="700" letter-spacing="0.4" fill="${darkHex}">${labelEsc}</text>
</svg>`;
  }

  const width = 520;
  const pad = 52;
  const qrSize = width - pad * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}">
  <rect width="${width}" height="${width}" rx="${opts.includeFrame ? 44 : 0}" fill="#FFFFFF" />
  <svg x="${pad}" y="${pad}" width="${qrSize}" height="${qrSize}" viewBox="${viewBox}">
    ${innerSvg}
  </svg>
</svg>`;
}

export function buildStyledQrDataUrl(
  url: string,
  options: StyledQrOptions | string = {}
): string {
  const svg = buildStyledQrSvg(url, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function generateQrSvg(
  url: string,
  options: StyledQrOptions | string = "#09090B"
): Promise<string> {
  return buildStyledQrSvg(url, options);
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

/**
 * Generates a print-ready minimalist table-tent card as an SVG featuring
 * the Telegram-style rounded QR code with center dining emblem.
 */
export async function generatePrintableTableCardSvg(options: {
  venueName: string;
  tagline?: string;
  url: string;
  primaryColor: string;
  tableCode?: string;
}): Promise<string> {
  const contrast = computeThemeContrast(options.primaryColor);
  const { viewBox, innerSvg } = buildStyledQrMatrixSvg(options.url, {
    darkHex: "#09090B",
    badgeHex: contrast.primary,
  });

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
  <rect x="24" y="24" width="552" height="792" rx="28" fill="#FAFAFA" stroke="#E4E4E7" stroke-width="2" />
  <rect x="24" y="24" width="552" height="10" rx="2" fill="${contrast.primary}" />

  <!-- Venue Identity -->
  <text x="300" y="108" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="30" font-weight="600" letter-spacing="-0.6" fill="#09090B">${venueNameEsc}</text>
  <text x="300" y="142" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="400" fill="#71717A">${taglineEsc}</text>

  <!-- Table / Action Badge -->
  <rect x="200" y="176" width="200" height="36" rx="18" fill="${contrast.primary}" />
  <text x="300" y="199" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" letter-spacing="1.4" fill="${contrast.foreground}">${tableLabel}</text>

  <!-- Telegram-Style Rounded QR Sticker Frame -->
  <rect x="116" y="248" width="368" height="368" rx="34" fill="#FFFFFF" stroke="#E4E4E7" stroke-width="2" />
  <svg x="142" y="274" width="316" height="316" viewBox="${viewBox}">
    ${innerSvg}
  </svg>

  <!-- Instructions -->
  <text x="300" y="672" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif" font-size="17" font-weight="500" fill="#18181B">Point your camera to browse the menu</text>
  <line x1="180" y1="712" x2="420" y2="712" stroke="#E4E4E7" stroke-width="1.5" />
  <text x="300" y="752" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" fill="#71717A">${displayUrl}</text>
</svg>`;
}
