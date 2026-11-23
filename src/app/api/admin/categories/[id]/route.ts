import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  commitBatchedWrites,
  menuItemsCol,
  tenantDoc,
} from "@/lib/firestore";
import { resolveAdminContext } from "@/lib/auth";
import { updateCategorySchema } from "@/lib/validation";
import { revalidatePublicMenu } from "@/lib/menu-data";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category update" },
      { status: 400 }
    );
  }

  const catRef = categoriesCol(ctx.tenantId).doc(id);
  const [catSnap, tenantSnap] = await Promise.all([
    catRef.get(),
    tenantDoc(ctx.tenantId).get(),
  ]);

  const existing = catSnap.data();
  const tenant = tenantSnap.data();
  if (!catSnap.exists || !existing || existing.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

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
  const canonicalName = nextNameEn || nextNameKm || existing.name;

  const updateData = {
    name: canonicalName,
    nameEn: nextNameEn || null,
    nameKm: nextNameKm || null,
    ...(parsed.data.isVisible !== undefined
      ? { isVisible: parsed.data.isVisible }
      : {}),
    ...(parsed.data.sortOrder !== undefined
      ? { sortOrder: parsed.data.sortOrder }
      : {}),
    updatedAt: new Date(),
  };

  await catRef.update(updateData);
  const updated = { ...existing, ...updateData };

  revalidatePublicMenu(tenant.slug);

  return NextResponse.json({
    category: {
      id: catRef.id,
      tenantId: updated.tenantId,
      name: updated.name,
      nameKm: updated.nameKm ?? "",
      nameEn: updated.nameEn ?? updated.name,
      sortOrder: updated.sortOrder,
      isVisible: updated.isVisible,
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const catRef = categoriesCol(ctx.tenantId).doc(id);
  const [catSnap, tenantSnap] = await Promise.all([
    catRef.get(),
    tenantDoc(ctx.tenantId).get(),
  ]);

  const existing = catSnap.data();
  const tenant = tenantSnap.data();
  if (!catSnap.exists || !existing || existing.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Cascade delete items belonging to this category
  const itemsSnap = await menuItemsCol(ctx.tenantId)
    .where("categoryId", "==", id)
    .get();

  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = itemsSnap.docs.map(
    (doc) => (batch) => batch.delete(doc.ref)
  );
  ops.push((batch) => batch.delete(catRef));

  await commitBatchedWrites(ops);
  revalidatePublicMenu(tenant.slug);

  return NextResponse.json({ ok: true });
}
