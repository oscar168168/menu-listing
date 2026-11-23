import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PauseCircle } from "lucide-react";
import { getCachedPublicMenuBySlug } from "@/lib/menu-data";
import { getTenantThemeStyle } from "@/lib/theme";
import { PublicMenuClient } from "@/components/public-menu/PublicMenuClient";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

interface PublicMenuPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PublicMenuPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCachedPublicMenuBySlug(slug);
  if (!data) {
    return { title: "Menu Not Found" };
  }
  return {
    title: data.tenant.name,
    description:
      data.tenant.meta.tagline || `Digital menu for ${data.tenant.name}`,
  };
}

export default async function PublicMenuPage({ params }: PublicMenuPageProps) {
  const { slug } = await params;
  const data = await getCachedPublicMenuBySlug(slug);

  if (!data) {
    notFound();
  }

  // Suspended venues show a clean, neutral unavailable screen on QR scan
  if (data.tenant.status === "SUSPENDED") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center sm:border-x sm:border-zinc-200">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-[#FAFAFA] text-zinc-500">
          <PauseCircle className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <h1 className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-zinc-950">
          Menu temporarily unavailable
        </h1>
        <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-zinc-500">
          {data.tenant.name}&apos;s digital menu is currently paused. Please ask
          a member of staff for assistance.
        </p>
      </div>
    );
  }

  // Server-side CSS custom property injection guarantees zero FOUC
  const themeVars = getTenantThemeStyle(data.tenant.primaryColor);

  return (
    <div style={themeVars} className="min-h-dvh bg-[#FAFAFA]">
      <PublicMenuClient
        tenant={data.tenant}
        categories={data.categories}
      />
    </div>
  );
}
