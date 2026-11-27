import { after, NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  findTenantBySlug,
  formatCambodiaDateKey,
  scanEventsCol,
  scanStatsCol,
} from "@/lib/firestore";
import { scanEventSchema } from "@/lib/validation";

const SCAN_EVENT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

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
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SCAN_EVENT_TTL_MS);
        const dateKey = formatCambodiaDateKey(now);

        await Promise.all([
          scanEventsCol(tenant.id).add({
            tenantId: tenant.id,
            tableCode,
            userAgent,
            scannedAt: now,
            expiresAt,
          }),
          scanStatsCol(tenant.id)
            .doc(dateKey)
            .set(
              {
                tenantId: tenant.id,
                date: dateKey,
                totalScans: FieldValue.increment(1),
                ...(tableCode
                  ? { tableCounts: { [tableCode]: FieldValue.increment(1) } }
                  : {}),
                updatedAt: now,
              },
              { merge: true }
            ),
        ]);
      } catch (err) {
        console.warn("Background scan log failed:", err);
      }
    });

    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}
