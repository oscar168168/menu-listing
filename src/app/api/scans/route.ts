import { after, NextRequest, NextResponse } from "next/server";
import { findTenantBySlug, scanEventsCol } from "@/lib/firestore";
import { scanEventSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = scanEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid scan payload" },
        { status: 400 }
      );
    }

    const slug = parsed.data.slug;
    const tableCode = parsed.data.tableCode || null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? null;

    after(async () => {
      try {
        const tenant = await findTenantBySlug(slug);
        if (!tenant || tenant.data.status !== "ACTIVE") {
          return;
        }
        await scanEventsCol(tenant.id).add({
          tenantId: tenant.id,
          tableCode,
          userAgent,
          scannedAt: new Date(),
        });
      } catch (err) {
        console.warn("Background scan log failed:", err);
      }
    });

    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}
