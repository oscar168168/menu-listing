import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import {
  categoriesCol,
  cookingStylesCol,
  findTenantBySlug,
  menuItemsCol,
  scanEventsCol,
  tenantDoc,
  tenantsCol,
  toDate,
  usersCol,
  type FirestoreCookingStyleDoc,
  type FirestoreMenuItemDoc,
  type FirestoreTenantDoc,
} from "@/lib/firestore";
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

export function serializeTenant(
  id: string,
  tenant: Omit<FirestoreTenantDoc, "updatedAt"> & { updatedAt?: unknown }
): SerializedTenant {
  const nameEn = tenant.nameEn?.trim() || tenant.name;
  const nameKm = tenant.nameKm?.trim() || "";
  return {
    id,
    name: tenant.name,
    nameKm,
    nameEn,
    slug: tenant.slug,
    status: tenant.status,
    vendorMode: tenant.vendorMode ?? "CART",
    logoUrl: tenant.logoUrl ?? null,
    coverUrl: tenant.coverUrl ?? null,
    currency: normalizePrimaryCurrency(tenant.currency),
    showDualCurrency: tenant.showDualCurrency ?? true,
    exchangeRate: normalizeExchangeRate(tenant.exchangeRate),
    khrRounding: normalizeKhrRounding(tenant.khrRounding),
    primaryColor: sanitizeHex(tenant.primaryColor),
    meta: parseTenantMeta(tenant.metaJson),
    createdAt: toDate(tenant.createdAt).toISOString(),
  };
}

export function serializeMenuItem(
  id: string,
  item: {
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
  }
): SerializedMenuItem {
  const nameEn = item.nameEn?.trim() || item.name;
  const nameKm = item.nameKm?.trim() || "";
  const descriptionEn = item.descriptionEn?.trim() || item.description;
  const descriptionKm = item.descriptionKm?.trim() || "";

  return {
    id,
    tenantId: item.tenantId,
    categoryId: item.categoryId,
    name: item.name,
    nameKm,
    nameEn,
    description: item.description,
    descriptionKm,
    descriptionEn,
    pricingType: item.pricingType ?? "FIXED",
    weightUnit: item.weightUnit ?? null,
    price: toNumber(item.priceDecimal) ?? 0,
    marketPriceMin: toNumber(item.marketPriceMin),
    marketPriceMax: toNumber(item.marketPriceMax),
    variants: parseVariants(item.variantsJson),
    cookingStyles: parseCookingStyles(item.cookingStylesJson),
    imageUrl: item.imageUrl ?? null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    isAvailable: item.isAvailable ?? true,
    sortOrder: item.sortOrder ?? 0,
  };
}

export function serializeCookingStylePreset(
  id: string,
  preset: Pick<
    FirestoreCookingStyleDoc,
    "tenantId" | "nameKm" | "nameEn" | "defaultSurcharge" | "sortOrder"
  >
): SerializedCookingStylePreset {
  return {
    id,
    tenantId: preset.tenantId,
    nameKm: preset.nameKm?.trim() ?? "",
    nameEn: preset.nameEn?.trim() ?? "",
    defaultSurcharge: toNumber(preset.defaultSurcharge) ?? 0,
    sortOrder: preset.sortOrder ?? 0,
  };
}

export function getPublicMenuTag(slug: string): string {
  return `public-menu:${slug}`;
}

export function revalidatePublicMenu(slug: string): void {
  revalidateTag(getPublicMenuTag(slug), "max");
  revalidatePath(`/m/${slug}`);
}

function compareSortAndDate(
  a: { sortOrder?: number; createdAt?: unknown },
  b: { sortOrder?: number; createdAt?: unknown }
): number {
  const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime();
}

/**
 * Cached public menu loader for sub-second QR loads.
 * Strictly scopes categories & items inside tenants/{tenantId} and filters hidden categories.
 */
export async function getCachedPublicMenuBySlug(
  slug: string
): Promise<TenantMenuPayload | null> {
  const cachedFn = unstable_cache(
    async (normalizedSlug: string): Promise<TenantMenuPayload | null> => {
      const tenantFound = await findTenantBySlug(normalizedSlug);
      if (!tenantFound) return null;

      const { id: tenantId, data: tenant } = tenantFound;
      if (tenant.status === "SUSPENDED") {
        return {
          tenant: serializeTenant(tenantId, tenant),
          categories: [],
          cookingStylePresets: [],
        };
      }

      const [catSnap, itemSnap, presetSnap] = await Promise.all([
        categoriesCol(tenantId).get(),
        menuItemsCol(tenantId).get(),
        cookingStylesCol(tenantId).get(),
      ]);

      const itemsByCategory = new Map<
        string,
        Array<{ id: string; data: FirestoreMenuItemDoc }>
      >();
      const sortedItems = itemSnap.docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .sort((a, b) => compareSortAndDate(a.data, b.data));

      for (const entry of sortedItems) {
        const list = itemsByCategory.get(entry.data.categoryId) ?? [];
        list.push(entry);
        itemsByCategory.set(entry.data.categoryId, list);
      }

      const serializedCategories: SerializedCategory[] = catSnap.docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .filter((cat) => cat.data.isVisible !== false)
        .sort((a, b) => compareSortAndDate(a.data, b.data))
        .map((cat) => {
          const catItems = itemsByCategory.get(cat.id) ?? [];
          return {
            id: cat.id,
            tenantId,
            name: cat.data.name,
            nameKm: cat.data.nameKm?.trim() ?? "",
            nameEn: cat.data.nameEn?.trim() || cat.data.name,
            sortOrder: cat.data.sortOrder ?? 0,
            isVisible: cat.data.isVisible ?? true,
            items: catItems.map((it) => serializeMenuItem(it.id, it.data)),
          };
        })
        .filter((cat) => cat.items.length > 0);

      const presets = presetSnap.docs
        .map((doc) => ({ id: doc.id, data: doc.data() }))
        .sort((a, b) => compareSortAndDate(a.data, b.data))
        .map((p) => serializeCookingStylePreset(p.id, p.data));

      return {
        tenant: serializeTenant(tenantId, tenant),
        categories: serializedCategories,
        cookingStylePresets: presets,
      };
    },
    ["public-menu-v4", slug],
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
  const [tenantSnap, catSnap, itemSnap, presetSnap] = await Promise.all([
    tenantDoc(tenantId).get(),
    categoriesCol(tenantId).get(),
    menuItemsCol(tenantId).get(),
    cookingStylesCol(tenantId).get(),
  ]);

  if (!tenantSnap.exists) return null;
  const tenant = tenantSnap.data();
  if (!tenant) return null;

  const itemsByCategory = new Map<
    string,
    Array<{ id: string; data: FirestoreMenuItemDoc }>
  >();
  const sortedItems = itemSnap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort((a, b) => compareSortAndDate(a.data, b.data));

  for (const entry of sortedItems) {
    const list = itemsByCategory.get(entry.data.categoryId) ?? [];
    list.push(entry);
    itemsByCategory.set(entry.data.categoryId, list);
  }

  const categories: SerializedCategory[] = catSnap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort((a, b) => compareSortAndDate(a.data, b.data))
    .map((cat) => ({
      id: cat.id,
      tenantId,
      name: cat.data.name,
      nameKm: cat.data.nameKm?.trim() ?? "",
      nameEn: cat.data.nameEn?.trim() || cat.data.name,
      sortOrder: cat.data.sortOrder ?? 0,
      isVisible: cat.data.isVisible ?? true,
      items: (itemsByCategory.get(cat.id) ?? []).map((it) =>
        serializeMenuItem(it.id, it.data)
      ),
    }));

  const presets = presetSnap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort((a, b) => compareSortAndDate(a.data, b.data))
    .map((p) => serializeCookingStylePreset(p.id, p.data));

  return {
    tenant: serializeTenant(tenantSnap.id, tenant),
    categories,
    cookingStylePresets: presets,
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

  const [tenantsSnap, adminsSnap] = await Promise.all([
    tenantsCol().get(),
    usersCol().where("role", "==", "MENU_ADMIN").get(),
  ]);

  const ownerByTenant = new Map<
    string,
    { email: string; name: string; createdAt: number }
  >();
  for (const userDoc of adminsSnap.docs) {
    const u = userDoc.data();
    if (!u.tenantId) continue;
    const createdMs = toDate(u.createdAt).getTime();
    const prev = ownerByTenant.get(u.tenantId);
    if (!prev || createdMs < prev.createdAt) {
      ownerByTenant.set(u.tenantId, {
        email: u.email,
        name: u.name,
        createdAt: createdMs,
      });
    }
  }

  const tenantDocs = tenantsSnap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort(
      (a, b) =>
        toDate(b.data.createdAt).getTime() - toDate(a.data.createdAt).getTime()
    );

  const perTenantStats = await Promise.all(
    tenantDocs.map(async ({ id, data }) => {
      const [
        itemCountSnap,
        catCountSnap,
        scanTotalSnap,
        scan7dSnap,
        tableScansSnap,
      ] = await Promise.all([
        menuItemsCol(id).count().get(),
        categoriesCol(id).count().get(),
        scanEventsCol(id).count().get(),
        scanEventsCol(id)
          .where("scannedAt", ">=", sevenDaysAgo)
          .count()
          .get(),
        scanEventsCol(id)
          .where("tableCode", ">", "")
          .select("tableCode")
          .get(),
      ]);

      const tableCounts = new Map<string, number>();
      for (const scanDoc of tableScansSnap.docs) {
        const code = scanDoc.data().tableCode;
        if (typeof code === "string" && code.trim()) {
          tableCounts.set(code, (tableCounts.get(code) ?? 0) + 1);
        }
      }

      const topTables = Array.from(tableCounts.entries())
        .map(([tableCode, count]) => ({ tableCode, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      const owner = ownerByTenant.get(id);
      const summary: SuperAdminTenantSummary = {
        id,
        name: data.name,
        nameKm: data.nameKm?.trim() ?? "",
        nameEn: data.nameEn?.trim() || data.name,
        slug: data.slug,
        status: data.status,
        vendorMode: data.vendorMode ?? "CART",
        primaryColor: sanitizeHex(data.primaryColor),
        currency: normalizePrimaryCurrency(data.currency),
        ownerEmail: owner?.email ?? null,
        ownerName: owner?.name ?? null,
        itemCount: itemCountSnap.data().count,
        categoryCount: catCountSnap.data().count,
        scanCount: scanTotalSnap.data().count,
        scansLast7Days: scan7dSnap.data().count,
        createdAt: toDate(data.createdAt).toISOString(),
      };

      const analyticsRow: ScanAnalyticsRow = {
        tenantId: id,
        tenantName: data.name,
        slug: data.slug,
        primaryColor: summary.primaryColor,
        totalScans: summary.scanCount,
        last7Days: summary.scansLast7Days,
        topTables,
      };

      return { summary, analyticsRow };
    })
  );

  const summaries = perTenantStats.map((entry) => entry.summary);
  const analytics = perTenantStats
    .map((entry) => entry.analyticsRow)
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
