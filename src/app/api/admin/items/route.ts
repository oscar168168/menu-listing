import { NextRequest, NextResponse } from "next/server";
import { categoriesCol, menuItemsCol, tenantDoc } from "@/lib/firestore";
import { resolveAdminContext } from "@/lib/auth";
import { resolveCategoryPricingMode } from "@/lib/i18n";
import { createMenuItemSchema } from "@/lib/validation";
import { revalidatePublicMenu, serializeMenuItem } from "@/lib/menu-data";
import type { WeightUnit } from "@/types/menu";

export async function POST(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createMenuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid item data" },
      { status: 400 }
    );
  }

  const [catSnap, tenantSnap, existingItems] = await Promise.all([
    categoriesCol(ctx.tenantId).doc(parsed.data.categoryId).get(),
    tenantDoc(ctx.tenantId).get(),
    menuItemsCol(ctx.tenantId)
      .where("categoryId", "==", parsed.data.categoryId)
      .select("sortOrder")
      .get(),
  ]);
  const category = catSnap.data();
  const tenant = tenantSnap.data();

  if (!catSnap.exists || !category || category.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json(
      { error: "Target category not found for your venue" },
      { status: 404 }
    );
  }

  const maxSortOrder = existingItems.docs.reduce((max, doc) => {
    const val = doc.data().sortOrder;
    return typeof val === "number" && val > max ? val : max;
  }, -1);

  const nameKm = parsed.data.nameKm || "";
  const nameEn = parsed.data.nameEn || parsed.data.name || "";
  const canonicalName = nameKm || nameEn;
  const descriptionKm = parsed.data.descriptionKm || "";
  const descriptionEn = parsed.data.descriptionEn || parsed.data.description || "";
  const now = new Date();

  const pricingMode = resolveCategoryPricingMode({
    id: catSnap.id,
    pricingMode: category.pricingMode,
    name: category.name,
    nameKm: category.nameKm,
    nameEn: category.nameEn,
  });
  const pricingType = pricingMode;
  const weightUnit: WeightUnit | null =
    pricingType === "WEIGHT_BASED" ? "PER_KG" : null;

  const itemRef = menuItemsCol(ctx.tenantId).doc();
  const itemData = {
    tenantId: ctx.tenantId,
    categoryId: catSnap.id,
    name: canonicalName,
    nameKm: nameKm || canonicalName,
    nameEn: nameEn || canonicalName,
    description: descriptionKm || descriptionEn,
    descriptionKm: descriptionKm || null,
    descriptionEn: descriptionEn || null,
    pricingType,
    weightUnit,
    priceDecimal: parsed.data.price,
    marketPriceMin: null,
    marketPriceMax: null,
    variantsJson:
      parsed.data.variants.length > 0 ? parsed.data.variants : null,
    cookingStylesJson:
      parsed.data.cookingStyles.length > 0 ? parsed.data.cookingStyles : null,
    imageUrl: parsed.data.imageUrl ?? null,
    tags: parsed.data.tags,
    isAvailable: parsed.data.isAvailable,
    sortOrder: maxSortOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  await itemRef.set(itemData);
  revalidatePublicMenu(tenant.slug);

  return NextResponse.json(
    { item: serializeMenuItem(itemRef.id, itemData) },
    { status: 201 }
  );
}
