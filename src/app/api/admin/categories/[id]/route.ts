import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const existing = await prisma.category.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!existing) {
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

  const updated = await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: canonicalName,
      nameEn: nextNameEn || null,
      nameKm: nextNameKm || null,
      ...(parsed.data.isVisible !== undefined
        ? { isVisible: parsed.data.isVisible }
        : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
    },
  });

  revalidatePublicMenu(existing.tenant.slug);

  return NextResponse.json({
    category: {
      id: updated.id,
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
  const existing = await prisma.category.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id: existing.id } });
  revalidatePublicMenu(existing.tenant.slug);

  return NextResponse.json({ ok: true });
}
