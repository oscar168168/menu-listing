import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveAdminContext } from "@/lib/auth";
import { updateMenuItemSchema } from "@/lib/validation";
import { revalidatePublicMenu, serializeMenuItem } from "@/lib/menu-data";

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

  const existing = await prisma.menuItem.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  if (
    parsed.data.categoryId !== undefined &&
    parsed.data.categoryId !== existing.categoryId
  ) {
    const targetCategory = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!targetCategory) {
      return NextResponse.json(
        { error: "Target category does not belong to your venue" },
        { status: 403 }
      );
    }
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

  const nextDescEn =
    parsed.data.descriptionEn !== undefined
      ? parsed.data.descriptionEn
      : parsed.data.description !== undefined
        ? parsed.data.description
        : existing.descriptionEn ?? existing.description;
  const nextDescKm =
    parsed.data.descriptionKm !== undefined
      ? parsed.data.descriptionKm
      : existing.descriptionKm ?? "";

  const updated = await prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.categoryId !== undefined
        ? { categoryId: parsed.data.categoryId }
        : {}),
      name: canonicalName,
      nameEn: nextNameEn || null,
      nameKm: nextNameKm || null,
      description: nextDescEn || nextDescKm,
      descriptionEn: nextDescEn || null,
      descriptionKm: nextDescKm || null,
      ...(parsed.data.pricingType !== undefined
        ? { pricingType: parsed.data.pricingType }
        : {}),
      ...(parsed.data.weightUnit !== undefined
        ? { weightUnit: parsed.data.weightUnit }
        : {}),
      ...(parsed.data.price !== undefined
        ? { priceDecimal: parsed.data.price }
        : {}),
      ...(parsed.data.marketPriceMin !== undefined
        ? { marketPriceMin: parsed.data.marketPriceMin }
        : {}),
      ...(parsed.data.marketPriceMax !== undefined
        ? { marketPriceMax: parsed.data.marketPriceMax }
        : {}),
      ...(parsed.data.variants !== undefined
        ? {
            variantsJson:
              parsed.data.variants.length > 0
                ? (parsed.data.variants as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          }
        : {}),
      ...(parsed.data.cookingStyles !== undefined
        ? {
            cookingStylesJson:
              parsed.data.cookingStyles.length > 0
                ? (parsed.data.cookingStyles as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
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
    },
  });

  revalidatePublicMenu(existing.tenant.slug);

  return NextResponse.json({ item: serializeMenuItem(updated) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.menuItem.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id: existing.id } });
  revalidatePublicMenu(existing.tenant.slug);

  return NextResponse.json({ ok: true });
}
