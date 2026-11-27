import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  deleteOrphanedMediaUrl,
  menuItemsCol,
  tenantDoc,
} from "@/lib/firestore";
import { resolveAdminContext } from "@/lib/auth";
import { resolveCategoryPricingMode } from "@/lib/i18n";
import { updateMenuItemSchema } from "@/lib/validation";
import { revalidatePublicMenu, serializeMenuItem } from "@/lib/menu-data";
import type { WeightUnit } from "@/types/menu";

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
  const parsed = updateMenuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid item update" },
      { status: 400 }
    );
  }

  const itemRef = menuItemsCol(ctx.tenantId).doc(id);
  const targetCatId = parsed.data.categoryId;
  const [itemSnap, tenantSnap, targetCatSnap] = await Promise.all([
    itemRef.get(),
    tenantDoc(ctx.tenantId).get(),
    targetCatId !== undefined
      ? categoriesCol(ctx.tenantId).doc(targetCatId).get()
      : Promise.resolve(null),
  ]);
  const existing = itemSnap.data();
  const tenant = tenantSnap.data();

  if (!itemSnap.exists || !existing || existing.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  if (targetCatId !== undefined && targetCatId !== existing.categoryId) {
    if (!targetCatSnap?.exists || targetCatSnap.data()?.tenantId !== ctx.tenantId) {
      return NextResponse.json(
        { error: "Target category does not belong to your venue" },
        { status: 403 }
      );
    }
  }

  const effectiveCategorySnap =
    targetCatSnap && targetCatSnap.exists
      ? targetCatSnap
      : await categoriesCol(ctx.tenantId).doc(existing.categoryId).get();
  const effectiveCategory = effectiveCategorySnap.data();
  const effectivePricingMode = resolveCategoryPricingMode(
    effectiveCategory
      ? {
          id: effectiveCategorySnap.id,
          pricingMode: effectiveCategory.pricingMode,
          name: effectiveCategory.name,
          nameKm: effectiveCategory.nameKm,
          nameEn: effectiveCategory.nameEn,
        }
      : null
  );

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

  const nextDescKm =
    parsed.data.descriptionKm !== undefined
      ? parsed.data.descriptionKm
      : existing.descriptionKm ?? "";
  const nextDescEn =
    parsed.data.descriptionEn !== undefined
      ? parsed.data.descriptionEn
      : parsed.data.description !== undefined
        ? parsed.data.description
        : existing.descriptionEn ?? existing.description;

  const weightUnit: WeightUnit | null =
    effectivePricingMode === "WEIGHT_BASED" ? "PER_KG" : null;
  const updateData = {
    ...(parsed.data.categoryId !== undefined
      ? { categoryId: parsed.data.categoryId }
      : {}),
    name: canonicalName,
    nameKm: nextNameKm || canonicalName,
    nameEn: nextNameEn || canonicalName,
    description: nextDescKm || nextDescEn,
    descriptionKm: nextDescKm || null,
    descriptionEn: nextDescEn || null,
    pricingType: effectivePricingMode,
    weightUnit,
    ...(parsed.data.price !== undefined
      ? { priceDecimal: parsed.data.price }
      : {}),
    marketPriceMin: null,
    marketPriceMax: null,
    ...(parsed.data.variants !== undefined
      ? {
          variantsJson:
            parsed.data.variants.length > 0 ? parsed.data.variants : null,
        }
      : {}),
    ...(parsed.data.cookingStyles !== undefined
      ? {
          cookingStylesJson:
            parsed.data.cookingStyles.length > 0
              ? parsed.data.cookingStyles
              : null,
        }
      : {}),
    ...(parsed.data.imageUrl !== undefined
      ? { imageUrl: parsed.data.imageUrl }
      : {}),
    ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
    ...(parsed.data.isAvailable !== undefined
      ? { isAvailable: parsed.data.isAvailable }
      : {}),
    ...(parsed.data.sortOrder !== undefined
      ? { sortOrder: parsed.data.sortOrder }
      : {}),
    updatedAt: new Date(),
  };

  await itemRef.update(updateData);
  if (
    parsed.data.imageUrl !== undefined &&
    existing.imageUrl &&
    parsed.data.imageUrl !== existing.imageUrl
  ) {
    await deleteOrphanedMediaUrl(ctx.tenantId, existing.imageUrl).catch(
      () => undefined
    );
  }
  const updated = { ...existing, ...updateData };

  revalidatePublicMenu(tenant.slug);

  return NextResponse.json({ item: serializeMenuItem(itemRef.id, updated) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const itemRef = menuItemsCol(ctx.tenantId).doc(id);
  const [itemSnap, tenantSnap] = await Promise.all([
    itemRef.get(),
    tenantDoc(ctx.tenantId).get(),
  ]);
  const existing = itemSnap.data();
  const tenant = tenantSnap.data();

  if (!itemSnap.exists || !existing || existing.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  await itemRef.delete();
  if (existing.imageUrl) {
    await deleteOrphanedMediaUrl(ctx.tenantId, existing.imageUrl).catch(
      () => undefined
    );
  }
  revalidatePublicMenu(tenant.slug);

  return NextResponse.json({ ok: true });
}
