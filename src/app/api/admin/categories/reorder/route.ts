import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdminContext } from "@/lib/auth";
import { reorderCategoriesSchema } from "@/lib/validation";
import { revalidatePublicMenu } from "@/lib/menu-data";

export async function PATCH(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = reorderCategoriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid category ordering" },
      { status: 400 }
    );
  }

  // Strictly verify all submitted category IDs belong to this tenant
  const owned = await prisma.category.findMany({
    where: {
      tenantId: ctx.tenantId,
      id: { in: parsed.data.orderedIds },
    },
    select: { id: true },
  });

  if (owned.length !== parsed.data.orderedIds.length) {
    return NextResponse.json(
      { error: "One or more categories do not belong to your venue" },
      { status: 403 }
    );
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.category.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data: { sortOrder: index },
      })
    )
  );

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  if (tenant) revalidatePublicMenu(tenant.slug);

  return NextResponse.json({ ok: true });
}
