import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, tenantId: ctx.tenantId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Target category not found for your venue" },
      { status: 404 }
    );
  }

  const maxSort = await prisma.menuItem.aggregate({
    where: { tenantId: ctx.tenantId, categoryId: category.id },
    _max: { sortOrder: true },
  });

  const nameEn = parsed.data.nameEn || parsed.data.name || "";
  const nameKm = parsed.data.nameKm || "";
  const canonicalName = nameEn || nameKm;
  const descriptionEn = parsed.data.descriptionEn || parsed.data.description || "";
  const descriptionKm = parsed.data.descriptionKm || "";

  const created = await prisma.menuItem.create({
    data: {
      tenantId: ctx.tenantId,
      categoryId: category.id,
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
        parsed.data.variants.length > 0
          ? (parsed.data.variants as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      cookingStylesJson:
        parsed.data.cookingStyles.length > 0
          ? (parsed.data.cookingStyles as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      imageUrl: parsed.data.imageUrl,
      tags: parsed.data.tags,
      isAvailable: parsed.data.isAvailable,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePublicMenu(category.tenant.slug);

  return NextResponse.json(
    { item: serializeMenuItem(created) },
    { status: 201 }
  );
}
