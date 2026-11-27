import Link from "next/link";
import {
  ArrowUpRight,
  Layers,
  Palette,
  Shield,
  Smartphone,
} from "lucide-react";
import {
  ChhneQrLogo,
  ChhneQrMark,
} from "@/components/ui/ChhneQrLogo";
import {
  getCachedHomeVenues,
  type HomeVenueSummary,
} from "@/lib/menu-data";
import { computeThemeContrast, parseTenantMeta } from "@/lib/theme";

export const revalidate = 120;

export default async function HomePage() {
  let activeTenants: HomeVenueSummary[] = [];

  const isBuildWithoutCreds =
    process.env.NEXT_PHASE === "phase-production-build" &&
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() &&
    !process.env.FIRESTORE_EMULATOR_HOST?.trim();

  if (!isBuildWithoutCreds) {
    try {
      activeTenants = await getCachedHomeVenues();
    } catch (err) {
      console.warn("HomePage Firestore load warning:", err);
    }
  }

  const firstSampleSlug = activeTenants[0]?.slug ?? null;

  return (
    <div className="min-h-dvh bg-[#FAFAFA] text-zinc-950">
      {/* Minimal Top Bar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <ChhneQrLogo size={30} showWordmark />

          <nav className="flex items-center gap-2 text-[13px]">
            <Link
              href="/admin"
              prefetch={false}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
            >
              Menu Admin
            </Link>
            <Link
              href="/super-admin"
              prefetch={false}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
            >
              Super Admin
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-zinc-950 px-3 py-1.5 font-medium text-white hover:bg-zinc-800"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
        {/* Editorial Hero + Brand Showcase */}
        <section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-zinc-700">
              <span lang="km">ឆ្នេរ QR</span>
              <span className="text-zinc-300">·</span>
              <span>DIGITAL QR MENU PLATFORM</span>
            </p>
            <h1 className="mt-4 text-[34px] font-semibold leading-[1.12] tracking-[-0.03em] text-zinc-950 sm:text-[42px]">
              Instant bilingual QR menus built for modern restaurants &amp; coastal dining.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
              Effortless <span lang="km">ខ្មែរ | EN</span> switching with Kantumruy Pro
              typography, linked KHR &amp; USD pricing, per-plate and per-kg fresh
              catch categories, fast daily stock updates, and Telegram-style table QR cards.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800"
              >
                Open ChhneQR Portal
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              {firstSampleSlug && (
                <Link
                  href={`/m/${firstSampleSlug}?table=05`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  Preview sample menu
                  <ArrowUpRight className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                </Link>
              )}
            </div>
          </div>

          {/* Brand Identity Card */}
          <div className="flex shrink-0 flex-col items-center rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:w-[280px]">
            <ChhneQrMark size={88} />
            <div className="mt-4 text-center">
              <p className="text-[23px] font-extrabold tracking-[-0.03em] text-[#0B2239]">
                Chhne<span className="text-[#0D9488]">QR</span>
              </p>
              <p lang="km" className="mt-1 text-[13px] font-medium text-zinc-500">
                ឆ្នេរ QR · ប្រព័ន្ធម៉ឺនុយឌីជីថល
              </p>
            </div>
          </div>
        </section>

        {/* Live Sample Venues Grid */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-zinc-600">
              Sample Demo Venues
            </h2>
            <span className="text-[12px] tabular-nums text-zinc-500">
              {activeTenants.length} sample {activeTenants.length === 1 ? "venue" : "venues"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeTenants.map((tenant) => {
              const meta = parseTenantMeta(tenant.metaJson);
              const contrast = computeThemeContrast(tenant.primaryColor);
              return (
                <Link
                  key={tenant.id}
                  href={`/m/${tenant.slug}?table=05`}
                  className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
                          style={{ backgroundColor: contrast.primary }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-zinc-950">
                            {tenant.nameEn || tenant.name}
                          </h3>
                          {tenant.nameKm && (
                            <p
                              lang="km"
                              className="truncate text-[13px] text-zinc-500"
                            >
                              {tenant.nameKm}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium"
                          style={{
                            backgroundColor: contrast.primary,
                            color: contrast.foreground,
                          }}
                        >
                          {tenant.currency}
                        </span>
                        <span className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          {tenant.vendorMode === "CART"
                            ? "Add to Cart Mode"
                            : "Listing Only Mode"}
                        </span>
                      </div>
                    </div>

                    {meta.tagline && (
                      <p className="mt-2.5 text-[13px] text-zinc-500">
                        {meta.tagline}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 text-[12px] text-zinc-500">
                    <span className="tabular-nums">
                      {tenant.categoryCount} categories · {tenant.itemCount}{" "}
                      dishes · 1 USD = {tenant.exchangeRate.toLocaleString()} ៛
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-zinc-900 group-hover:underline">
                      /m/{tenant.slug}
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Three Interfaces Architecture Overview */}
        <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <Smartphone className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
            <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              Bilingual Mobile Menu
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              Zero-reload ខ្មែរ | EN switching, dual USD/KHR pricing, cooking
              style selection, and Show-to-Staff high-contrast table shortlist.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <Palette className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
            <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              Daily Market Admin
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              Touch-friendly morning stock &amp; per-kg rate sheet, live 375px
              preview, 80/20 WCAG color studio, and printable batch table QRs.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <Shield className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
            <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              Super Admin Governance
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              Provision isolated venues with preset Khmer cooking styles, toggle
              suspension states, inspect scan analytics, and impersonate admins.
            </p>
          </div>
        </section>

        <div className="mt-12 flex items-center justify-between border-t border-zinc-200 pt-5 text-[12px] text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
            ChhneQR (ឆ្នេរ QR) · Next.js App Router · Cloud Firestore
          </span>
          <span>Digital QR Menu Platform</span>
        </div>
      </main>
    </div>
  );
}
