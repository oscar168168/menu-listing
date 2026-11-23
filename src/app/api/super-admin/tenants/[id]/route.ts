import { NextRequest, NextResponse } from "next/server";
import { tenantDoc } from "@/lib/firestore";
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
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  const ref = tenantDoc(id);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const nextStatus = parsed.data.status ?? existing.status;
  const nextVendorMode = parsed.data.vendorMode ?? existing.vendorMode;

  await ref.update({
    status: nextStatus,
    vendorMode: nextVendorMode,
    updatedAt: new Date(),
  });

  revalidatePublicMenu(existing.slug);

  return NextResponse.json({
    tenant: {
      id: snap.id,
      slug: existing.slug,
      status: nextStatus,
      vendorMode: nextVendorMode,
    },
  });
}
