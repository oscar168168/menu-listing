import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAdminContext } from "@/lib/auth";
import { getAdminTenantMenu } from "@/lib/menu-data";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";

export const metadata: Metadata = {
  title: "Menu Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    redirect("/login?next=/admin");
  }

  const data = await getAdminTenantMenu(ctx.tenantId);
  if (!data) {
    redirect("/super-admin");
  }

  return (
    <AdminWorkspace
      initialTenant={data.tenant}
      initialCategories={data.categories}
      cookingStylePresets={data.cookingStylePresets}
      user={ctx.user}
      isImpersonating={ctx.isImpersonating}
    />
  );
}
