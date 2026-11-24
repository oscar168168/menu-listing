import { NextRequest, NextResponse } from "next/server";
import { tenantDoc } from "@/lib/firestore";
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
    const issue = parsed.error.issues[0];
    const prefix = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
    return NextResponse.json(
      { error: `${prefix}${issue?.message ?? "Invalid theme settings"}` },
      { status: 400 }
    );
  }

  const ref = tenantDoc(ctx.tenantId);
  const existingSnap = await ref.get();
  const existing = existingSnap.data();
  if (!existingSnap.exists || !existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const nameEn = parsed.data.nameEn || parsed.data.name || parsed.data.nameKm;
  const nameKm = parsed.data.nameKm || "";
  const canonicalName = nameEn || nameKm;

  const updateData = {
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
      tagline:
        parsed.data.meta.taglineEn ||
        parsed.data.meta.tagline ||
        parsed.data.meta.taglineKm,
    },
    updatedAt: new Date(),
  };

  await ref.update(updateData);

  const merged = { ...existing, ...updateData };
  revalidatePublicMenu(merged.slug);

  return NextResponse.json({ tenant: serializeTenant(ref.id, merged) });
}
