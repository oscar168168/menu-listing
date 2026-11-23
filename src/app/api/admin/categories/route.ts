import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdminContext } from "@/lib/auth";
import { createCategorySchema } from "@/lib/validation";
import { revalidatePublicMenu } from "@/lib/menu-data";

export async function POST(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category data" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const maxSort = await prisma.category.aggregate({
    where: { tenantId: ctx.tenantId },
    _max: { sortOrder: true },
  });

  const nameEn = parsed.data.nameEn || parsed.data.name || parsed.data.nameKm;
  const nameKm = parsed.data.nameKm || "";
  const canonicalName = nameEn || nameKm;

  const created = await prisma.category.create({
    data: {
      tenantId: ctx.tenantId,
      name: canonicalName,
      nameEn: nameEn || null,
      nameKm: nameKm || null,
      isVisible: parsed.data.isVisible,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePublicMenu(tenant.slug);

  return NextResponse.json(
    {
      category: {
        id: created.id,
        tenantId: created.tenantId,
        name: created.name,
        nameKm: created.nameKm ?? "",
        nameEn: created.nameEn ?? created.name,
        sortOrder: created.sortOrder,
        isVisible: created.isVisible,
        items: [],
      },
    },
    { status: 201 }
  );
}
