import { NextRequest, NextResponse } from "next/server";
import { categoriesCol, tenantDoc } from "@/lib/firestore";
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

  const [tenantSnap, existingCats] = await Promise.all([
    tenantDoc(ctx.tenantId).get(),
    categoriesCol(ctx.tenantId).select("sortOrder").get(),
  ]);
  const tenant = tenantSnap.data();
  if (!tenantSnap.exists || !tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const maxSortOrder = existingCats.docs.reduce((max, doc) => {
    const val = doc.data().sortOrder;
    return typeof val === "number" && val > max ? val : max;
  }, -1);

  const nameEn = parsed.data.nameEn || parsed.data.name || parsed.data.nameKm;
  const nameKm = parsed.data.nameKm || "";
  const canonicalName = nameEn || nameKm;
  const now = new Date();
  const sortOrder = maxSortOrder + 1;

  const docRef = categoriesCol(ctx.tenantId).doc();
  const docData = {
    tenantId: ctx.tenantId,
    name: canonicalName,
    nameEn: nameEn || null,
    nameKm: nameKm || null,
    isVisible: parsed.data.isVisible,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  await docRef.set(docData);

  revalidatePublicMenu(tenant.slug);

  return NextResponse.json(
    {
      category: {
        id: docRef.id,
        tenantId: docData.tenantId,
        name: docData.name,
        nameKm: docData.nameKm ?? "",
        nameEn: docData.nameEn ?? docData.name,
        sortOrder: docData.sortOrder,
        isVisible: docData.isVisible,
        items: [],
      },
    },
    { status: 201 }
  );
}
