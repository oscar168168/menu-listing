import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  commitBatchedWrites,
  getDb,
  tenantDoc,
} from "@/lib/firestore";
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

  const catCollection = categoriesCol(ctx.tenantId);
  const tenantRef = tenantDoc(ctx.tenantId);
  const catRefs = parsed.data.orderedIds.map((id) => catCollection.doc(id));
  const [tenantSnap, ...catSnaps] = await getDb().getAll(
    tenantRef,
    ...catRefs
  );

  const tenant = tenantSnap?.data();
  if (!tenantSnap?.exists || !tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (
    catSnaps.some(
      (s) => !s.exists || s.data()?.tenantId !== ctx.tenantId
    )
  ) {
    return NextResponse.json(
      { error: "One or more categories do not belong to your venue" },
      { status: 403 }
    );
  }

  const now = new Date();
  await commitBatchedWrites(
    parsed.data.orderedIds.map((id, index) => (batch) => {
      batch.update(catCollection.doc(id), {
        sortOrder: index,
        updatedAt: now,
      });
    })
  );

  if (tenant.slug) revalidatePublicMenu(tenant.slug);

  return NextResponse.json({ ok: true });
}
