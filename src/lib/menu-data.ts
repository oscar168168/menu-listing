import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseTenantMeta, sanitizeHex } from "@/lib/theme";
import {
  normalizeExchangeRate,
  normalizeKhrRounding,
  normalizePrimaryCurrency,
} from "@/lib/currency";
import type {
  CookingStyleOption,
  ItemVariant,
  PricingType,
  ScanAnalyticsRow,
  SerializedCategory,
  SerializedCookingStylePreset,
  SerializedMenuItem,
  SerializedTenant,
  SuperAdminTenantSummary,
  TenantMenuPayload,
  WeightUnit,
} from "@/types/menu";

export function parseVariants(raw: unknown): ItemVariant[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): ItemVariant | null => {
      if (!entry || typeof entry !== "object") return null;
      const rec = entry as Record<string, unknown>;
      const label = typeof rec.label === "string" ? rec.label.trim() : "";
      const labelKm =
        typeof rec.labelKm === "string" && rec.labelKm.trim()
          ? rec.labelKm.trim()
          : undefined;
      const price =
        typeof rec.price === "number" ? rec.price : Number(rec.price);
      if (!label || Number.isNaN(price) || price < 0) return null;
      return labelKm ? { label, labelKm, price } : { label, price };
    })
    .filter((v): v is ItemVariant => v !== null);
}

export function parseCookingStyles(raw: unknown): CookingStyleOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx) => {
      if (!entry || typeof entry !== "object") return null;
      const rec = entry as Record<string, unknown>;
      const id =
        typeof rec.id === "string" && rec.id.trim()
          ? rec.id.trim()
          : `style-${idx}`;
      const nameKm = typeof rec.nameKm === "string" ? rec.nameKm.trim() : "";
      const nameEn = typeof rec.nameEn === "string" ? rec.nameEn.trim() : "";
      const surcharge =
        typeof rec.surcharge === "number"
          ? rec.surcharge
          : Number(rec.surcharge ?? 0);
      if (!nameKm && !nameEn) return null;
      return {
        id,
        nameKm,
        nameEn,
        surcharge: Number.isFinite(surcharge) && surcharge >= 0 ? surcharge : 0,
      };
    })
    .filter((v): v is CookingStyleOption => v !== null);
}

function toNumber(
  val: { toNumber: () => number } | number | string | null | undefined
): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number(val.toFixed(2));
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isNaN(n) ? null : Number(n.toFixed(2));
  }
  return Number(val.toNumber().toFixed(2));
}

export function serializeTenant(tenant: {
  id: string;
  name: string;
  nameKm: string | null;
  nameEn: string | null;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  vendorMode: "CART" | "LISTING_ONLY";
  logoUrl: string | null;
  coverUrl: string | null;
  currency: string;
  showDualCurrency: boolean;
  exchangeRate: number;
  khrRounding: number;
  primaryColor: string;
  metaJson: unknown;
  createdAt: Date;
}): SerializedTenant {
  const nameEn = tenant.nameEn?.trim() || tenant.name;
  const nameKm = tenant.nameKm?.trim() || "";
  return {
    id: tenant.id,
    name: tenant.name,
    nameKm,
    nameEn,
    slug: tenant.slug,
    status: tenant.status,
    vendorMode: tenant.vendorMode ?? "CART",
    logoUrl: tenant.logoUrl,
    coverUrl: tenant.coverUrl,
    currency: normalizePrimaryCurrency(tenant.currency),
    showDualCurrency: tenant.showDualCurrency,
    exchangeRate: normalizeExchangeRate(tenant.exchangeRate),
    khrRounding: normalizeKhrRounding(tenant.khrRounding),
    primaryColor: sanitizeHex(tenant.primaryColor),
    meta: parseTenantMeta(tenant.metaJson),
    createdAt: tenant.createdAt.toISOString(),
  };
}

export function serializeMenuItem(item: {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  nameKm: string | null;
  nameEn: string | null;
  description: string;
  descriptionKm: string | null;
  descriptionEn: string | null;
  pricingType: PricingType;
  weightUnit: WeightUnit | null;
  priceDecimal: { toNumber: () => number } | number | string;
  marketPriceMin: { toNumber: () => number } | number | string | null;
  marketPriceMax: { toNumber: () => number } | number | string | null;
  variantsJson: unknown;
  cookingStylesJson: unknown;
  imageUrl: string | null;
  tags: string[];
  isAvailable: boolean;
  sortOrder: number;
}): SerializedMenuItem {
  const nameEn = item.nameEn?.trim() || item.name;
  const nameKm = item.nameKm?.trim() || "";
  const descriptionEn = item.descriptionEn?.trim() || item.description;
  const descriptionKm = item.descriptionKm?.trim() || "";

  return {
    id: item.id,
    tenantId: item.tenantId,
    categoryId: item.categoryId,
    name: item.name,
    nameKm,
    nameEn,
    description: item.description,
    descriptionKm,
    descriptionEn,
    pricingType: item.pricingType,
    weightUnit: item.weightUnit,
    price: toNumber(item.priceDecimal) ?? 0,
    marketPriceMin: toNumber(item.marketPriceMin),
    marketPriceMax: toNumber(item.marketPriceMax),
    variants: parseVariants(item.variantsJson),
    cookingStyles: parseCookingStyles(item.cookingStylesJson),
    imageUrl: item.imageUrl,
    tags: item.tags,
    isAvailable: item.isAvailable,
    sortOrder: item.sortOrder,
  };
}

export function serializeCookingStylePreset(preset: {
  id: string;
  tenantId: string;
  nameKm: string | null;
  nameEn: string | null;
  defaultSurcharge: { toNumber: () => number } | number | string;
  sortOrder: number;
}): SerializedCookingStylePreset {
  return {
    id: preset.id,
    tenantId: preset.tenantId,
    nameKm: preset.nameKm?.trim() ?? "",
    nameEn: preset.nameEn?.trim() ?? "",
    defaultSurcharge: toNumber(preset.defaultSurcharge) ?? 0,
    sortOrder: preset.sortOrder,
  };
}

export function getPublicMenuTag(slug: string): string {
  return `public-menu:${slug}`;
}

export function revalidatePublicMenu(slug: string): void {
  revalidateTag(getPublicMenuTag(slug), "max");
  revalidatePath(`/m/${slug}`);
}

/**
 * Cached public menu loader for sub-second QR loads.
 * Strictly scopes categories & items by tenant.id and filters hidden categories.
 */
export async function getCachedPublicMenuBySlug(
  slug: string
): Promise<TenantMenuPayload | null> {
  const cachedFn = unstable_cache(
    async (normalizedSlug: string): Promise<TenantMenuPayload | null> => {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: normalizedSlug },
      });
      if (!tenant) return null;

      if (tenant.status === "SUSPENDED") {
        return {
          tenant: serializeTenant(tenant),
          categories: [],
          cookingStylePresets: [],
        };
      }

      const [categories, presets] = await Promise.all([
        prisma.category.findMany({
          where: {
            tenantId: tenant.id,
            isVisible: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            items: {
              where: { tenantId: tenant.id },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        }),
        prisma.cookingStyle.findMany({
          where: { tenantId: tenant.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
      ]);

      const serializedCategories: SerializedCategory[] = categories
        .filter((cat) => cat.items.length > 0)
        .map((cat) => ({
          id: cat.id,
          tenantId: cat.tenantId,
          name: cat.name,
          nameKm: cat.nameKm?.trim() ?? "",
          nameEn: cat.nameEn?.trim() || cat.name,
          sortOrder: cat.sortOrder,
          isVisible: cat.isVisible,
          items: cat.items.map(serializeMenuItem),
        }));

      return {
        tenant: serializeTenant(tenant),
        categories: serializedCategories,
        cookingStylePresets: presets.map(serializeCookingStylePreset),
      };
    },
    ["public-menu-v3", slug],
    {
      revalidate: 300,
      tags: [getPublicMenuTag(slug)],
    }
  );

  return cachedFn(slug.toLowerCase());
}

/**
 * Uncached admin loader strictly scoped by tenantId.
 */
export async function getAdminTenantMenu(
  tenantId: string
): Promise<TenantMenuPayload | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) return null;

  const [categories, presets] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          where: { tenantId: tenant.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.cookingStyle.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    tenant: serializeTenant(tenant),
    categories: categories.map((cat) => ({
      id: cat.id,
      tenantId: cat.tenantId,
      name: cat.name,
      nameKm: cat.nameKm?.trim() ?? "",
      nameEn: cat.nameEn?.trim() || cat.name,
      sortOrder: cat.sortOrder,
      isVisible: cat.isVisible,
      items: cat.items.map(serializeMenuItem),
    })),
    cookingStylePresets: presets.map(serializeCookingStylePreset),
  };
}

export async function getSuperAdminDashboardData(): Promise<{
  tenants: SuperAdminTenantSummary[];
  analytics: ScanAnalyticsRow[];
  totals: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalItems: number;
    totalScans: number;
    scansLast7Days: number;
  };
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [tenants, recentCounts, tableBreakdown] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: "MENU_ADMIN" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { email: true, name: true },
        },
        _count: {
          select: {
            menuItems: true,
            categories: true,
            scanEvents: true,
          },
        },
      },
    }),
    prisma.scanEvent.groupBy({
      by: ["tenantId"],
      where: { scannedAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.scanEvent.groupBy({
      by: ["tenantId", "tableCode"],
      where: { tableCode: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const recentMap = new Map<string, number>();
  for (const row of recentCounts) {
    recentMap.set(row.tenantId, row._count._all);
  }

  const tablesByTenant = new Map<
    string,
    Array<{ tableCode: string; count: number }>
  >();
  for (const row of tableBreakdown) {
    if (!row.tableCode) continue;
    const list = tablesByTenant.get(row.tenantId) ?? [];
    list.push({ tableCode: row.tableCode, count: row._count._all });
    tablesByTenant.set(row.tenantId, list);
  }

  const summaries: SuperAdminTenantSummary[] = tenants.map((t) => {
    const owner = t.users[0];
    return {
      id: t.id,
      name: t.name,
      nameKm: t.nameKm?.trim() ?? "",
      nameEn: t.nameEn?.trim() || t.name,
      slug: t.slug,
      status: t.status,
      vendorMode: t.vendorMode,
      primaryColor: sanitizeHex(t.primaryColor),
      currency: normalizePrimaryCurrency(t.currency),
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      itemCount: t._count.menuItems,
      categoryCount: t._count.categories,
      scanCount: t._count.scanEvents,
      scansLast7Days: recentMap.get(t.id) ?? 0,
      createdAt: t.createdAt.toISOString(),
    };
  });

  const analytics: ScanAnalyticsRow[] = summaries
    .map((s) => ({
      tenantId: s.id,
      tenantName: s.name,
      slug: s.slug,
      primaryColor: s.primaryColor,
      totalScans: s.scanCount,
      last7Days: s.scansLast7Days,
      topTables: (tablesByTenant.get(s.id) ?? [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    }))
    .sort((a, b) => b.totalScans - a.totalScans);

  const activeTenants = summaries.filter((t) => t.status === "ACTIVE").length;
  const totalItems = summaries.reduce((acc, t) => acc + t.itemCount, 0);
  const totalScans = summaries.reduce((acc, t) => acc + t.scanCount, 0);
  const scansLast7Days = summaries.reduce((acc, t) => acc + t.scansLast7Days, 0);

  return {
    tenants: summaries,
    analytics,
    totals: {
      totalTenants: summaries.length,
      activeTenants,
      suspendedTenants: summaries.length - activeTenants,
      totalItems,
      totalScans,
      scansLast7Days,
    },
  };
}
