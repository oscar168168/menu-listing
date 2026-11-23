import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanEventSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = scanEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: parsed.data.slug.toLowerCase() },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== "ACTIVE") {
      return NextResponse.json({ recorded: false }, { status: 200 });
    }

    const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? null;

    await prisma.scanEvent.create({
      data: {
        tenantId: tenant.id,
        tableCode: parsed.data.tableCode || null,
        userAgent,
      },
    });

    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}
