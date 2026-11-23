import { NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth";
import { getAdminTenantMenu } from "@/lib/menu-data";

export async function GET() {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAdminTenantMenu(ctx.tenantId);
  if (!data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    isImpersonating: ctx.isImpersonating,
    user: ctx.user,
  });
}
