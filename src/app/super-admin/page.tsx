import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { getSuperAdminDashboardData } from "@/lib/menu-data";
import { parsePortalLocale, PORTAL_LOCALE_COOKIE } from "@/lib/portal-i18n";
import { SuperAdminWorkspace } from "@/components/super-admin/SuperAdminWorkspace";

export const metadata: Metadata = {
  title: "Super Admin",
};

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    redirect("/login?next=/super-admin");
  }

  const [dashboardData, cookieStore] = await Promise.all([
    getSuperAdminDashboardData(),
    cookies(),
  ]);
  const initialLocale = parsePortalLocale(
    cookieStore.get(PORTAL_LOCALE_COOKIE)?.value
  );

  return (
    <SuperAdminWorkspace
      initialData={dashboardData}
      user={admin}
      initialLocale={initialLocale}
    />
  );
}
