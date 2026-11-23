import { NextRequest, NextResponse } from "next/server";
import { categoriesCol, menuItemsCol, tenantDoc } from "@/lib/firestore";
import { resolveAdminContext } from "@/lib/auth";
import { createMenuItemSchema } from "@/lib/validation";
import { revalidatePublicMenu, serializeMenuItem } from "@/lib/menu-data";

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

  const [catSnap, tenantSnap] = await Promise.all([
    categoriesCol(ctx.tenantId).doc(parsed.data.categoryId).get(),
    tenantDoc(ctx.tenantId).get(),
  ]);
  const category = catSnap.data();
  const tenant = tenantSnap.data();

  if (!catSnap.exists || !category || category.tenantId !== ctx.tenantId || !tenant) {
    return NextResponse.json(
      { error: "Target category not found for your venue" },
      { status: 404 }
    );
  }

  const existingItems = await menuItemsCol(ctx.tenantId)
    .where("categoryId", "==", catSnap.id)
    .select("sortOrder")
    .get();
  const maxSortOrder = existingItems.docs.reduce((max, doc) => {
    const val = doc.data().sortOrder;
    return typeof val === "number" && val > max ? val : max;
  }, -1);

  const nameEn = parsed.data.nameEn || parsed.data.name || "";
  const nameKm = parsed.data.nameKm || "";
  const canonicalName = nameEn || nameKm;
  const descriptionEn = parsed.data.descriptionEn || parsed.data.description || "";
  const descriptionKm = parsed.data.descriptionKm || "";
  const now = new Date();

  const itemRef = menuItemsCol(ctx.tenantId).doc();
  const itemData = {
    tenantId: ctx.tenantId,
    categoryId: catSnap.id,
    name: canonicalName,
    nameEn: nameEn || null,
    nameKm: nameKm || null,
    description: descriptionEn || descriptionKm,
    descriptionEn: descriptionEn || null,
    descriptionKm: descriptionKm || null,
    pricingType: parsed.data.pricingType,
    weightUnit:
      parsed.data.pricingType === "FIXED" ? null : parsed.data.weightUnit,
    priceDecimal: parsed.data.price,
    marketPriceMin:
      parsed.data.pricingType === "MARKET_PRICE"
        ? parsed.data.marketPriceMin
        : null,
    marketPriceMax:
      parsed.data.pricingType === "MARKET_PRICE"
        ? parsed.data.marketPriceMax
        : null,
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
