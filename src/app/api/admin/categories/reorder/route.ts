import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  commitBatchedWrites,
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
  const snaps = await Promise.all(
    parsed.data.orderedIds.map((id) => catCollection.doc(id).get())
  );

  if (snaps.some((s) => !s.exists || s.data()?.tenantId !== ctx.tenantId)) {
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

  const tenantSnap = await tenantDoc(ctx.tenantId).get();
  const slug = tenantSnap.data()?.slug;
  if (slug) revalidatePublicMenu(slug);

  return NextResponse.json({ ok: true });
}
