import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tenantDoc } from "@/lib/firestore";
import { IMPERSONATE_COOKIE_NAME, requireSuperAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { tenantId?: string };
  if (!body.tenantId || typeof body.tenantId !== "string") {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const snap = await tenantDoc(body.tenantId).get();
  const data = snap.data();
  if (!snap.exists || !data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const tenant = { id: snap.id, slug: data.slug, name: data.name };

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE_NAME, tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true, tenant });
}

export async function DELETE() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
