import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  commitBatchedWrites,
  deleteOrphanedMediaUrl,
  menuItemsCol,
  tenantDoc,
} from "@/lib/firestore";
import { resolveAdminContext } from "@/lib/auth";
import { resolveCategoryPricingMode } from "@/lib/i18n";
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

  const nextNameKm =
    parsed.data.nameKm !== undefined
      ? parsed.data.nameKm
      : existing.nameKm ?? "";
  const nextNameEn =
    parsed.data.nameEn !== undefined
      ? parsed.data.nameEn
      : parsed.data.name !== undefined
        ? parsed.data.name
        : existing.nameEn ?? existing.name;
  const canonicalName = nextNameKm || nextNameEn || existing.name;
  const prevPricingMode = resolveCategoryPricingMode({
    id: catRef.id,
    pricingMode: existing.pricingMode,
    name: existing.name,
    nameKm: existing.nameKm,
    nameEn: existing.nameEn,
  });
  const nextPricingMode =
    parsed.data.pricingMode ??
    existing.pricingMode ??
    resolveCategoryPricingMode({
      id: catRef.id,
      name: canonicalName,
      nameKm: nextNameKm,
      nameEn: nextNameEn,
    });
  const now = new Date();

  const updateData = {
    name: canonicalName,
    nameKm: nextNameKm || canonicalName,
    nameEn: nextNameEn || canonicalName,
    ...(parsed.data.isVisible !== undefined
      ? { isVisible: parsed.data.isVisible }
      : {}),
    pricingMode: nextPricingMode,
    ...(parsed.data.sortOrder !== undefined
      ? { sortOrder: parsed.data.sortOrder }
      : {}),
    updatedAt: now,
  };

  if (parsed.data.pricingMode !== undefined && nextPricingMode !== prevPricingMode) {
    const itemsSnap = await menuItemsCol(ctx.tenantId)
      .where("categoryId", "==", id)
      .select()
      .get();
    const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [
      (batch) => batch.update(catRef, updateData),
    ];
    for (const itemDoc of itemsSnap.docs) {
      ops.push((batch) =>
        batch.update(itemDoc.ref, {
          pricingType: nextPricingMode,
          weightUnit: nextPricingMode === "WEIGHT_BASED" ? "PER_KG" : null,
          updatedAt: now,
        })
      );
    }
    await commitBatchedWrites(ops);
  } else {
    await catRef.update(updateData);
  }
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
      pricingMode: nextPricingMode,
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
  const [catSnap, tenantSnap, itemsSnap] = await Promise.all([
    catRef.get(),
    tenantDoc(ctx.tenantId).get(),
    menuItemsCol(ctx.tenantId)
      .where("categoryId", "==", id)
      .select("imageUrl")
      .get(),
  ]);

  const existing = catSnap.data();
  const tenant = tenantSnap.data();
  if (!catSnap.exists || !existing || existing.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const candidateMediaUrls = Array.from(
    new Set(
      itemsSnap.docs
        .map((doc) => doc.data().imageUrl)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    )
  );

  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = itemsSnap.docs.map(
    (doc) => (batch) => batch.delete(doc.ref)
  );
  ops.push((batch) => batch.delete(catRef));

  await commitBatchedWrites(ops);
  if (candidateMediaUrls.length > 0) {
    await Promise.all(
      candidateMediaUrls.map((url) =>
        deleteOrphanedMediaUrl(ctx.tenantId, url).catch(() => undefined)
      )
    );
  }
  revalidatePublicMenu(tenant.slug);

  return NextResponse.json({ ok: true });
}
