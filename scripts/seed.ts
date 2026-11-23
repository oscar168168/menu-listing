try {
  process.loadEnvFile?.();
} catch {
  // .env is optional if variables are already in environment
}

import { hashPassword } from "../src/lib/auth";
import {
  DEMO_CATALOG_VERSION,
  syncTenantDefaultCatalog,
} from "../src/lib/default-catalog";
import {
  cookingStylesCol,
  findTenantBySlug,
  findUserByEmail,
  getDb,
  scanEventsCol,
  tenantsCol,
  usersCol,
  type FirestoreTenantDoc,
} from "../src/lib/firestore";

const shouldReset = process.argv.includes("--reset");

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  role: "SUPER_ADMIN" | "MENU_ADMIN";
  tenantId: string | null;
}) {
  const existing = await findUserByEmail(input.email);
  const now = new Date();
  if (existing) {
    await usersCol().doc(existing.id).update({
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      updatedAt: now,
    });
    return { id: existing.id, email: input.email };
  }

  const ref = usersCol().doc();
  await ref.set({
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash: hashPassword(input.password),
    role: input.role,
    tenantId: input.tenantId,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id, email: input.email.toLowerCase() };
}

async function upsertTenant(input: {
  slug: string;
  name: string;
  nameEn: string;
  nameKm: string;
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
    const updatedData: FirestoreTenantDoc = {
      ...existing.data,
      name: input.name,
      nameEn: input.nameEn,
      nameKm: input.nameKm,
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
    coverUrl: null,
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
    name: "Platform Admin",
    password: "Admin123!",
    role: "SUPER_ADMIN",
    tenantId: null,
  });
  console.log(`✓ Super Admin ready: ${superAdmin.email}`);

  // ==========================================================================
  // 2. Venue 1: Sora Seafood Grill (CART mode, KHR Primary + Dual USD)
  // ==========================================================================
  const sora = await upsertTenant({
    name: "Sora Seafood Grill",
    nameEn: "Sora Seafood Grill",
    nameKm: "សូរ៉ា គ្រឿងសមុទ្រអាំង",
    slug: "sora-seafood-grill",
    vendorMode: "CART",
    currency: "KHR",
    showDualCurrency: true,
    exchangeRate: 4100,
    khrRounding: 100,
    primaryColor: "#1E293B",
    metaJson: {
      tagline: "Live tank seafood & charcoal grill in BKK1, Phnom Penh",
      taglineEn: "Live tank seafood & charcoal grill in BKK1, Phnom Penh",
      taglineKm: "គ្រឿងសមុទ្ររស់ និង អាំងធ្យូងធម្មជាតិ នៅបឹងកេងកង១ ភ្នំពេញ",
      openingHours: "Daily 11:00 – 23:00",
      address: "No. 48 Street 306, BKK1, Phnom Penh",
      phone: "+855 23 998 412",
      telegramUrl: "https://t.me/soraseafoodpp",
      facebookUrl: "https://facebook.com/soraseafoodgrill",
      googleMapsUrl: "https://maps.google.com/?q=BKK1+Phnom+Penh",
      wifiName: "Sora_BKK1_5G",
      wifiPassword: "kampot2026",
      footerNote: "Prices include local VAT. Freshly prepared to order.",
      footerNoteKm:
        "តម្លៃបូកបញ្ចូលពន្ធរួចជាស្រេច។ ចម្អិនថ្មីៗតាមការកុម្ម៉ង់។",
      serviceNote: "All taxes included · No service charge",
    },
  });

  await upsertUser({
    email: "owner@soraseafood.com",
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
    name: "Kep Bay Kitchen",
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
      tagline: "Daily boat-to-table coastal seafood by Kep Crab Market",
      taglineEn: "Daily boat-to-table coastal seafood by Kep Crab Market",
      taglineKm: "គ្រឿងសមុទ្រស្រស់ៗពីទូកនេសាទ ក្បែរផ្សារក្តាមខេត្តកែប",
      openingHours: "Daily 09:30 – 21:30",
      address: "Crab Market Waterfront, Road 33A, Kep",
      phone: "+855 12 784 220",
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

  // 4. Sample Scan Events
  const soraScans = (await scanEventsCol(sora.id).count().get()).data().count;
  const kepScans = (await scanEventsCol(kep.id).count().get()).data().count;
  if (soraScans === 0 && kepScans === 0) {
    const batch = db.batch();
    const nowMs = Date.now();
    const hour = 60 * 60 * 1000;
    const soraTables = ["01", "02", "05", "05", "05", "08", "VIP-1", null];
    const kepTables = ["01", "03", "04", "04", "DECK-2", null];

    for (let i = 0; i < 42; i++) {
      batch.set(scanEventsCol(sora.id).doc(), {
        tenantId: sora.id,
        tableCode: soraTables[i % soraTables.length] ?? null,
        userAgent: null,
        scannedAt: new Date(nowMs - i * 3.8 * hour),
      });
    }
    for (let i = 0; i < 28; i++) {
      batch.set(scanEventsCol(kep.id).doc(), {
        tenantId: kep.id,
        tableCode: kepTables[i % kepTables.length] ?? null,
        userAgent: null,
        scannedAt: new Date(nowMs - i * 5.2 * hour),
      });
    }
    await batch.commit();
    console.log("✓ Seeded 70 Cambodian dining QR scan events");
  }

  console.log(
    "✓ Cloud Firestore seed complete (7 default categories + 25,000៛ / 35,000៛ / 40,000៛ KHR items):"
  );
  console.log("  Super Admin: admin@menuos.app / Admin123!");
  console.log(
    "  Venue 1 (/m/sora-seafood-grill, KHR+USD): owner@soraseafood.com / Menu123!"
  );
  console.log(
    "  Venue 2 (/m/kep-bay-kitchen, KHR+USD): chef@kepbaykitchen.com / Menu123!"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
