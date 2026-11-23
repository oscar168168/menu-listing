import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdminContext } from "@/lib/auth";
import { updateThemeSchema } from "@/lib/validation";
import { revalidatePublicMenu, serializeTenant } from "@/lib/menu-data";

export async function PATCH(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = updateThemeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid theme settings" },
      { status: 400 }
    );
  }

  const nameEn = parsed.data.nameEn || parsed.data.name || parsed.data.nameKm;
  const nameKm = parsed.data.nameKm || "";
  const canonicalName = nameEn || nameKm;

  const updated = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      name: canonicalName,
      nameEn: nameEn || null,
      nameKm: nameKm || null,
      primaryColor: parsed.data.primaryColor,
      vendorMode: parsed.data.vendorMode,
      currency: parsed.data.currency,
      showDualCurrency: parsed.data.showDualCurrency,
      exchangeRate: parsed.data.exchangeRate,
      khrRounding: parsed.data.khrRounding,
      ...(parsed.data.logoUrl !== undefined
        ? { logoUrl: parsed.data.logoUrl }
        : {}),
      ...(parsed.data.coverUrl !== undefined
        ? { coverUrl: parsed.data.coverUrl }
        : {}),
      metaJson: {
        ...parsed.data.meta,
        tagline: parsed.data.meta.taglineEn || parsed.data.meta.tagline || parsed.data.meta.taglineKm,
      },
    },
  });

  revalidatePublicMenu(updated.slug);

  return NextResponse.json({ tenant: serializeTenant(updated) });
}
