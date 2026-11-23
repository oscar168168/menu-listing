import { NextRequest, NextResponse } from "next/server";
import { findTenantBySlug, scanEventsCol } from "@/lib/firestore";
import { scanEventSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = scanEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const tenant = await findTenantBySlug(parsed.data.slug);
    if (!tenant || tenant.data.status !== "ACTIVE") {
      return NextResponse.json({ recorded: false }, { status: 200 });
    }

    const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? null;

    await scanEventsCol(tenant.id).add({
      tenantId: tenant.id,
      tableCode: parsed.data.tableCode || null,
      userAgent,
      scannedAt: new Date(),
    });

    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}
