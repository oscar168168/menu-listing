import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAdminContext } from "@/lib/auth";
import { getAdminTenantMenu } from "@/lib/menu-data";
import { parsePortalLocale, PORTAL_LOCALE_COOKIE } from "@/lib/portal-i18n";
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

  const [data, cookieStore] = await Promise.all([
    getAdminTenantMenu(ctx.tenantId),
    cookies(),
  ]);
  if (!data) {
    redirect("/super-admin");
  }

  const initialLocale = parsePortalLocale(
    cookieStore.get(PORTAL_LOCALE_COOKIE)?.value
  );

  return (
    <AdminWorkspace
      initialTenant={data.tenant}
      initialCategories={data.categories}
      cookingStylePresets={data.cookingStylePresets}
      user={ctx.user}
      isImpersonating={ctx.isImpersonating}
      initialLocale={initialLocale}
    />
  );
}
