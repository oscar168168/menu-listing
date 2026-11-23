import { redirect } from "next/navigation";
import { resolveAdminContext } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    redirect("/login?next=/admin");
  }

  return <>{children}</>;
}
