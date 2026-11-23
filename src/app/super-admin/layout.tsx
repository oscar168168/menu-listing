import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    redirect("/login?next=/super-admin");
  }

  return <>{children}</>;
}
