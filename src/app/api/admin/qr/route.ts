import { NextRequest, NextResponse } from "next/server";
import { tenantDoc } from "@/lib/firestore";
import { resolveAdminContext } from "@/lib/auth";
import { parseTenantMeta } from "@/lib/theme";
import {
  buildMenuUrl,
  generatePrintableTableCardSvg,
  generateQrPngBuffer,
  generateQrSvg,
} from "@/lib/qr";

export async function GET(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantSnap = await tenantDoc(ctx.tenantId).get();
  const tenant = tenantSnap.data();
  if (!tenantSnap.exists || !tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "svg";
  const tableCode = searchParams.get("table")?.trim() || undefined;
  const origin =
    searchParams.get("origin")?.trim() ||
    request.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const targetUrl = buildMenuUrl(origin, tenant.slug, tableCode);
  const fileSuffix = tableCode
    ? `${tenant.slug}-table-${tableCode.replace(/[^a-zA-Z0-9_-]/g, "")}`
    : tenant.slug;

  if (format === "png") {
    const pngBuffer = await generateQrPngBuffer(targetUrl, 1200);
    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${fileSuffix}.png"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "card") {
    const meta = parseTenantMeta(tenant.metaJson);
    const cardSvg = await generatePrintableTableCardSvg({
      venueName: tenant.name,
      tagline: meta.tagline,
      url: targetUrl,
      primaryColor: tenant.primaryColor,
      tableCode,
    });
    return new NextResponse(cardSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="table-card-${fileSuffix}.svg"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const svg = await generateQrSvg(targetUrl);
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="qr-${fileSuffix}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
