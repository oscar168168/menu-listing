import { NextRequest, NextResponse } from "next/server";
import { findTenantBySlug, tenantDoc } from "@/lib/firestore";
import { requireSuperAdmin } from "@/lib/auth";
import { updateTenantStatusSchema } from "@/lib/validation";
import { revalidatePublicMenu } from "@/lib/menu-data";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = updateTenantStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid venue update" },
      { status: 400 }
    );
  }

  const ref = tenantDoc(id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const oldSlug = existing.slug;
  const nextSlug = parsed.data.slug ?? existing.slug;

  if (nextSlug !== oldSlug) {
    const conflict = await findTenantBySlug(nextSlug);
    if (conflict && conflict.id !== id) {
      return NextResponse.json(
        { error: `URL slug "/m/${nextSlug}" is already used by another venue.` },
        { status: 409 }
      );
    }
  }

  const nextStatus = parsed.data.status ?? existing.status;
  const nextVendorMode = parsed.data.vendorMode ?? existing.vendorMode;
  const nextCurrency = parsed.data.currency ?? existing.currency;
  const nextNameEn =
    parsed.data.nameEn !== undefined
      ? parsed.data.nameEn
      : parsed.data.name !== undefined
        ? parsed.data.name
        : existing.nameEn ?? existing.name;
  const nextNameKm =
    parsed.data.nameKm !== undefined
      ? parsed.data.nameKm
      : existing.nameKm ?? "";
  const nextName = nextNameEn || nextNameKm || existing.name;

  await ref.update({
    slug: nextSlug,
    name: nextName,
    nameEn: nextNameEn || null,
    nameKm: nextNameKm || null,
    status: nextStatus,
    vendorMode: nextVendorMode,
    currency: nextCurrency,
    updatedAt: new Date(),
  });

  revalidatePublicMenu(oldSlug);
  if (nextSlug !== oldSlug) {
    revalidatePublicMenu(nextSlug);
  }

  return NextResponse.json({
    tenant: {
      id: snap.id,
      slug: nextSlug,
      name: nextName,
      nameEn: nextNameEn || nextName,
      nameKm: nextNameKm || "",
      status: nextStatus,
      vendorMode: nextVendorMode,
      currency: nextCurrency,
    },
  });
}
