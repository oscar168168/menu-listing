try {
  process.loadEnvFile?.();
} catch {
  // .env is optional if variables are already in environment
}

import { hashPassword } from "../src/lib/auth";
import {
  DEMO_CATALOG_VERSION,
  PAK_KHLANG_168_PROFILE,
  syncTenantDefaultCatalog,
} from "../src/lib/default-catalog";
import {
  buildUserLoginKeys,
  cookingStylesCol,
  findTenantBySlug,
  findUserByIdentifier,
  formatCambodiaDateKey,
  getDb,
  normalizePhone,
  scanEventsCol,
  scanStatsCol,
  tenantsCol,
  tenantSlugsCol,
  usersCol,
  type FirestoreTenantDoc,
} from "../src/lib/firestore";

const shouldReset = process.argv.includes("--reset");

async function upsertUser(input: {
  email: string;
  username: string;
  phone: string;
  name: string;
  password: string;
  role: "SUPER_ADMIN" | "MENU_ADMIN";
  tenantId: string | null;
}) {
  const existing =
    (await findUserByIdentifier(input.username)) ||
    (await findUserByIdentifier(input.phone)) ||
    (await findUserByIdentifier(input.email));
  const now = new Date();
  const normalizedEmail = input.email.toLowerCase();
  const normalizedUsername = input.username.toLowerCase();
  const normalizedPhone = normalizePhone(input.phone);
  const loginKeys = buildUserLoginKeys({
    email: normalizedEmail,
    username: normalizedUsername,
    phone: normalizedPhone,
  });

  if (existing) {
    await usersCol().doc(existing.id).update({
      email: normalizedEmail,
      username: normalizedUsername,
      phone: normalizedPhone,
      loginKeys,
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      updatedAt: now,
    });
    return {
      id: existing.id,
      email: normalizedEmail,
      username: normalizedUsername,
      phone: normalizedPhone,
    };
  }

  const ref = usersCol().doc();
  await ref.set({
    email: normalizedEmail,
    username: normalizedUsername,
    phone: normalizedPhone,
    loginKeys,
    name: input.name,
    passwordHash: hashPassword(input.password),
    role: input.role,
    tenantId: input.tenantId,
    createdAt: now,
    updatedAt: now,
  });
  return {
    id: ref.id,
    email: normalizedEmail,
    username: normalizedUsername,
    phone: normalizedPhone,
  };
}

async function upsertTenant(input: {
  slug: string;
  name: string;
  nameEn: string;
  nameKm: string;
  coverUrl?: string | null;
  vendorMode: "CART" | "LISTING_ONLY";
  currency: "USD" | "KHR";
  showDualCurrency: boolean;
  exchangeRate: number;
  khrRounding: 100 | 500;
  primaryColor: string;
  metaJson: Record<string, unknown>;
}): Promise<{ id: string; data: FirestoreTenantDoc }> {
  const existing = await findTenantBySlug(input.slug);
  const now = new Date();
  if (existing) {
    const nextCoverUrl = input.coverUrl ?? existing.data.coverUrl ?? null;
    const updatedData: FirestoreTenantDoc = {
      ...existing.data,
      name: input.name,
      nameEn: input.nameEn,
      nameKm: input.nameKm,
      coverUrl: nextCoverUrl,
      vendorMode: input.vendorMode,
      currency: input.currency,
      showDualCurrency: input.showDualCurrency,
      exchangeRate: input.exchangeRate,
      khrRounding: input.khrRounding,
      primaryColor: input.primaryColor,
      updatedAt: now,
    };
    await tenantsCol().doc(existing.id).update({
      name: input.name,
      nameEn: input.nameEn,
      nameKm: input.nameKm,
      coverUrl: nextCoverUrl,
      vendorMode: input.vendorMode,
      currency: input.currency,
      showDualCurrency: input.showDualCurrency,
      exchangeRate: input.exchangeRate,
      khrRounding: input.khrRounding,
      primaryColor: input.primaryColor,
      updatedAt: now,
    });
    return { id: existing.id, data: updatedData };
  }

  const ref = tenantsCol().doc();
  const data: FirestoreTenantDoc = {
    name: input.name,
    nameEn: input.nameEn,
    nameKm: input.nameKm,
    slug: input.slug,
    status: "ACTIVE",
    vendorMode: input.vendorMode,
    logoUrl: null,
    coverUrl: input.coverUrl ?? null,
    currency: input.currency,
    showDualCurrency: input.showDualCurrency,
    exchangeRate: input.exchangeRate,
    khrRounding: input.khrRounding,
    primaryColor: input.primaryColor,
    metaJson: input.metaJson,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  await tenantSlugsCol().doc(input.slug.toLowerCase()).set({
    tenantId: ref.id,
    slug: input.slug.toLowerCase(),
    updatedAt: now,
  });
  return { id: ref.id, data };
}

async function main() {
  console.log(
    shouldReset
      ? "Resetting & seeding MenuOS Cloud Firestore demo items..."
      : "Seeding MenuOS Cloud Firestore database..."
  );
  const db = getDb();
  const now = new Date();

  // 1. Super Admin
  const superAdmin = await upsertUser({
    email: "admin@menuos.app",
    username: "admin",
    phone: "012888999",
    name: "Platform Admin",
    password: "Admin123!",
    role: "SUPER_ADMIN",
    tenantId: null,
  });
  console.log(
    `✓ Super Admin ready: ${superAdmin.username} / ${superAdmin.phone}`
  );

  // ==========================================================================
  // 2. Venue 1: សម្រស់ឆ្នេរប៉ាក់ខ្លង 168 / Somros Chhne Pak Khlang 168
  // ==========================================================================
  const sora = await upsertTenant({
    name: PAK_KHLANG_168_PROFILE.nameKm,
    nameEn: PAK_KHLANG_168_PROFILE.nameEn,
    nameKm: PAK_KHLANG_168_PROFILE.nameKm,
    coverUrl: PAK_KHLANG_168_PROFILE.coverUrl,
    slug: "sora-seafood-grill",
    vendorMode: "CART",
    currency: "KHR",
    showDualCurrency: true,
    exchangeRate: 4100,
    khrRounding: 100,
    primaryColor: "#1E293B",
    metaJson: { ...PAK_KHLANG_168_PROFILE.metaJson },
  });

  await upsertUser({
    email: "owner@soraseafood.com",
    username: "sora",
    phone: "093765166",
    name: "Dara Sok",
    password: "Menu123!",
    role: "MENU_ADMIN",
    tenantId: sora.id,
  });

  const soraMeta =
    sora.data.metaJson && typeof sora.data.metaJson === "object"
      ? (sora.data.metaJson as Record<string, unknown>)
      : {};
  if (shouldReset || soraMeta.demoCatalogVersion !== DEMO_CATALOG_VERSION) {
    await syncTenantDefaultCatalog(sora.id, sora.data, {
      preserveCustomItems: !shouldReset,
    });
  }

  const soraPresetCount = (await cookingStylesCol(sora.id).count().get()).data()
    .count;
  if (soraPresetCount === 0) {
    const batch = db.batch();
    [
      {
        nameKm: "ឆាម្រេចកំពត",
        nameEn: "Kampot Pepper Stir-fry",
        defaultSurcharge: 8000,
      },
      { nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", defaultSurcharge: 0 },
      {
        nameKm: "ចំហុយស៊ីអ៊ីវខ្ញី",
        nameEn: "Steamed with Soy & Ginger",
        defaultSurcharge: 0,
      },
      {
        nameKm: "ឆាអំពិលទុំ",
        nameEn: "Tamarind Sauce",
        defaultSurcharge: 6000,
      },
      {
        nameKm: "ភ្លាកោះកុង",
        nameEn: "Koh Kong Spicy",
        defaultSurcharge: 6000,
      },
    ].forEach((p, idx) => {
      batch.set(cookingStylesCol(sora.id).doc(), {
        tenantId: sora.id,
        nameKm: p.nameKm,
        nameEn: p.nameEn,
        defaultSurcharge: p.defaultSurcharge,
        sortOrder: idx,
        createdAt: now,
        updatedAt: now,
      });
    });
    await batch.commit();
  }

  // ==========================================================================
  // 3. Venue 2: Kep Bay Kitchen (LISTING_ONLY mode, KHR Primary + Dual USD)
  // ==========================================================================
  const kep = await upsertTenant({
    name: "ផ្ទះបាយឆ្នេរកែប",
    nameEn: "Kep Bay Kitchen",
    nameKm: "ផ្ទះបាយឆ្នេរកែប",
    slug: "kep-bay-kitchen",
    vendorMode: "LISTING_ONLY",
    currency: "KHR",
    showDualCurrency: true,
    exchangeRate: 4100,
    khrRounding: 100,
    primaryColor: "#B45309",
    metaJson: {
      tagline: "គ្រឿងសមុទ្រស្រស់ៗពីទូកនេសាទ ក្បែរផ្សារក្តាមខេត្តកែប",
      taglineEn: "Daily boat-to-table coastal seafood by Kep Crab Market",
      taglineKm: "គ្រឿងសមុទ្រស្រស់ៗពីទូកនេសាទ ក្បែរផ្សារក្តាមខេត្តកែប",
      openingHours: "Daily 09:30 – 21:30",
      address: "Crab Market Waterfront, Road 33A, Kep",
      phone: "012 784 220",
      telegramUrl: "https://t.me/kepbaykitchen",
      facebookUrl: "https://facebook.com/kepbaykitchen",
      googleMapsUrl: "https://maps.google.com/?q=Kep+Crab+Market+Cambodia",
      wifiName: "KepBay_Waterfront",
      wifiPassword: "crabmarket",
      footerNote:
        "Prices in Cambodian Riel (KHR) include all local taxes. USD accepted at 4,100 ៛.",
      footerNoteKm:
        "តម្លៃគិតជាប្រាក់រៀលបូកបញ្ចូលពន្ធរួចជាស្រេច។ ទទួលប្រាក់ដុល្លារតាមអត្រា ៤,១០០ ៛។",
      serviceNote: "All taxes included · Cash & KHQR accepted",
    },
  });

  await upsertUser({
    email: "chef@kepbaykitchen.com",
    username: "kepbay",
    phone: "012784220",
    name: "Sopheak Meas",
    password: "Menu123!",
    role: "MENU_ADMIN",
    tenantId: kep.id,
  });

  const kepMeta =
    kep.data.metaJson && typeof kep.data.metaJson === "object"
      ? (kep.data.metaJson as Record<string, unknown>)
      : {};
  if (shouldReset || kepMeta.demoCatalogVersion !== DEMO_CATALOG_VERSION) {
    await syncTenantDefaultCatalog(kep.id, kep.data, {
      preserveCustomItems: !shouldReset,
    });
  }

  const kepPresetCount = (await cookingStylesCol(kep.id).count().get()).data()
    .count;
  if (kepPresetCount === 0) {
    const batch = db.batch();
    [
      {
        nameKm: "ឆាម្រេចខ្ចីកំពត",
        nameEn: "Green Kampot Pepper",
        defaultSurcharge: 0,
      },
      { nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", defaultSurcharge: 0 },
      {
        nameKm: "ចំហុយគល់ស្លឹកគ្រៃ",
        nameEn: "Steamed Lemongrass",
        defaultSurcharge: 0,
      },
      {
        nameKm: "ឆាអំពិលទុំ",
        nameEn: "Tamarind Glaze",
        defaultSurcharge: 6000,
      },
    ].forEach((p, idx) => {
      batch.set(cookingStylesCol(kep.id).doc(), {
        tenantId: kep.id,
        nameKm: p.nameKm,
        nameEn: p.nameEn,
        defaultSurcharge: p.defaultSurcharge,
        sortOrder: idx,
        createdAt: now,
        updatedAt: now,
      });
    });
    await batch.commit();
  }

  // 4. Sample Scan Events + Daily Aggregate Stats
  const soraScans = (await scanEventsCol(sora.id).count().get()).data().count;
  const kepScans = (await scanEventsCol(kep.id).count().get()).data().count;
  if (soraScans === 0 && kepScans === 0) {
    const batch = db.batch();
    const nowMs = Date.now();
    const hour = 60 * 60 * 1000;
    const ttlMs = 90 * 24 * 60 * 60 * 1000;
    const soraTables = ["01", "02", "05", "05", "05", "08", "VIP-1", null];
    const kepTables = ["01", "03", "04", "04", "DECK-2", null];

    const accumulateStat = (
      map: Map<string, { totalScans: number; tableCounts: Record<string, number> }>,
      scannedAt: Date,
      tableCode: string | null
    ) => {
      const dateKey = formatCambodiaDateKey(scannedAt);
      const entry = map.get(dateKey) ?? { totalScans: 0, tableCounts: {} };
      entry.totalScans += 1;
      if (tableCode) {
        entry.tableCounts[tableCode] = (entry.tableCounts[tableCode] ?? 0) + 1;
      }
      map.set(dateKey, entry);
    };

    const soraDaily = new Map<
      string,
      { totalScans: number; tableCounts: Record<string, number> }
    >();
    const kepDaily = new Map<
      string,
      { totalScans: number; tableCounts: Record<string, number> }
    >();

    for (let i = 0; i < 42; i++) {
      const scannedAt = new Date(nowMs - i * 3.8 * hour);
      const tableCode = soraTables[i % soraTables.length] ?? null;
      batch.set(scanEventsCol(sora.id).doc(), {
        tenantId: sora.id,
        tableCode,
        userAgent: null,
        scannedAt,
        expiresAt: new Date(scannedAt.getTime() + ttlMs),
      });
      accumulateStat(soraDaily, scannedAt, tableCode);
    }
    for (let i = 0; i < 28; i++) {
      const scannedAt = new Date(nowMs - i * 5.2 * hour);
      const tableCode = kepTables[i % kepTables.length] ?? null;
      batch.set(scanEventsCol(kep.id).doc(), {
        tenantId: kep.id,
        tableCode,
        userAgent: null,
        scannedAt,
        expiresAt: new Date(scannedAt.getTime() + ttlMs),
      });
      accumulateStat(kepDaily, scannedAt, tableCode);
    }

    for (const [dateKey, stat] of soraDaily.entries()) {
      batch.set(scanStatsCol(sora.id).doc(dateKey), {
        tenantId: sora.id,
        date: dateKey,
        totalScans: stat.totalScans,
        tableCounts: stat.tableCounts,
        updatedAt: now,
      });
    }
    for (const [dateKey, stat] of kepDaily.entries()) {
      batch.set(scanStatsCol(kep.id).doc(dateKey), {
        tenantId: kep.id,
        date: dateKey,
        totalScans: stat.totalScans,
        tableCounts: stat.tableCounts,
        updatedAt: now,
      });
    }
    await batch.commit();
    console.log("✓ Seeded 70 Cambodian dining QR scan events + daily stats");
  }

  console.log(
    "✓ Cloud Firestore seed complete (7 default categories + 25,000៛ / 35,000៛ / 40,000៛ KHR items):"
  );
  console.log("  Super Admin: admin or 012888999 / Admin123!");
  console.log(
    "  Venue 1 (/m/sora-seafood-grill, KHR+USD): sora or 093765166 / Menu123!"
  );
  console.log(
    "  Venue 2 (/m/kep-bay-kitchen, KHR+USD): kepbay or 012784220 / Menu123!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
