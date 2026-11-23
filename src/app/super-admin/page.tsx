import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { getSuperAdminDashboardData } from "@/lib/menu-data";
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

  const dashboardData = await getSuperAdminDashboardData();
  return <SuperAdminWorkspace initialData={dashboardData} user={admin} />;
}
