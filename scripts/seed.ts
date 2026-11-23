try {
  process.loadEnvFile?.();
} catch {
  // .env is optional if variables are already in environment
}

import { hashPassword } from "../src/lib/auth";
import {
  categoriesCol,
  cookingStylesCol,
  findTenantBySlug,
  findUserByEmail,
  getDb,
  scanEventsCol,
  tenantsCol,
  usersCol,
  menuItemsCol,
} from "../src/lib/firestore";

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
}) {
  const existing = await findTenantBySlug(input.slug);
  const now = new Date();
  if (existing) {
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
    return existing.id;
  }

  const ref = tenantsCol().doc();
  await ref.set({
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
  });
  return ref.id;
}

async function main() {
  console.log("Seeding MenuOS Cloud Firestore database...");
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
  // 2. Venue 1: Sora Seafood Grill (Phnom Penh — USD Primary + Dual KHR)
  // ==========================================================================
  const soraId = await upsertTenant({
    name: "Sora Seafood Grill",
    nameEn: "Sora Seafood Grill",
    nameKm: "សូរ៉ា គ្រឿងសមុទ្រអាំង",
    slug: "sora-seafood-grill",
    vendorMode: "CART",
    currency: "USD",
    showDualCurrency: true,
    exchangeRate: 4100,
    khrRounding: 500,
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
      footerNote:
        "Prices exclude 10% VAT. Live tank seafood is weighed table-side prior to cooking.",
      footerNoteKm:
        "តម្លៃមិនទាន់បូកបញ្ចូលពន្ធអាករ ១០% ទេ។ គ្រឿងសមុទ្ររស់ត្រូវបានថ្លឹងបង្ហាញនៅតុមុនពេលចម្អិន។",
      serviceNote: "10% VAT applies · No service charge",
    },
  });

  await upsertUser({
    email: "owner@soraseafood.com",
    name: "Dara Sok",
    password: "Menu123!",
    role: "MENU_ADMIN",
    tenantId: soraId,
  });

  const soraPresetCount = (await cookingStylesCol(soraId).count().get()).data().count;
  if (soraPresetCount === 0) {
    const batch = db.batch();
    [
      { nameKm: "ឆាម្រេចកំពត", nameEn: "Kampot Pepper Stir-fry", defaultSurcharge: 2.0 },
      { nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", defaultSurcharge: 0 },
      { nameKm: "ចំហុយស៊ីអ៊ីវខ្ញី", nameEn: "Steamed with Soy & Ginger", defaultSurcharge: 0 },
      { nameKm: "ឆាអំពិលទុំ", nameEn: "Tamarind Sauce", defaultSurcharge: 1.5 },
      { nameKm: "ភ្លាកោះកុង", nameEn: "Koh Kong Spicy", defaultSurcharge: 1.5 },
    ].forEach((p, idx) => {
      batch.set(cookingStylesCol(soraId).doc(), {
        tenantId: soraId,
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

  const soraCatCount = (await categoriesCol(soraId).count().get()).data().count;
  if (soraCatCount === 0) {
    const batch = db.batch();
    const liveTankRef = categoriesCol(soraId).doc();
    const coldPlatesRef = categoriesCol(soraId).doc();
    const riceNoodleRef = categoriesCol(soraId).doc();
    const drinksRef = categoriesCol(soraId).doc();

    batch.set(liveTankRef, {
      tenantId: soraId,
      name: "Live Tank & Crab",
      nameEn: "Live Tank & Crab",
      nameKm: "គ្រឿងសមុទ្ររស់ និង ក្តាម",
      sortOrder: 0,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(coldPlatesRef, {
      tenantId: soraId,
      name: "Koh Kong & Raw Plates",
      nameEn: "Koh Kong & Raw Plates",
      nameKm: "ភ្លា និង ញាំគ្រឿងសមុទ្រ",
      sortOrder: 1,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(riceNoodleRef, {
      tenantId: soraId,
      name: "Wok, Rice & Noodles",
      nameEn: "Wok, Rice & Noodles",
      nameKm: "បាយឆា និង មីឆា",
      sortOrder: 2,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(drinksRef, {
      tenantId: soraId,
      name: "Fresh Drinks",
      nameEn: "Fresh Drinks",
      nameKm: "ភេសជ្ជៈស្រស់",
      sortOrder: 3,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    const soraItems = [
      {
        categoryId: liveTankRef.id,
        name: "Kampot Pepper Crab",
        nameEn: "Kampot Pepper Crab",
        nameKm: "ក្តាមឆាម្រេចកំពត",
        description:
          "Live Kep mud crab wok-tossed with fresh green Kampot peppercorn clusters, garlic, and light oyster glaze.",
        descriptionEn:
          "Live Kep mud crab wok-tossed with fresh green Kampot peppercorn clusters, garlic, and light oyster glaze.",
        descriptionKm:
          "ក្តាមសមុទ្ររស់ពីខេត្តកែប ឆាជាមួយម្រេចខ្ចីកំពតស្រស់ ខ្ទឹមស និង ទឹកប្រេងខ្យងពិសេស។",
        pricingType: "WEIGHT_BASED" as const,
        weightUnit: "PER_500G" as const,
        priceDecimal: 18.0,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: [
          { id: "kampot-pepper", nameKm: "ឆាម្រេចកំពត", nameEn: "Kampot Pepper Stir-fry", surcharge: 0 },
          { id: "tamarind", nameKm: "ឆាអំពិលទុំ", nameEn: "Tamarind Sauce", surcharge: 1.5 },
          { id: "steamed-ginger", nameKm: "ចំហុយខ្ញី", nameEn: "Steamed with Ginger", surcharge: 0 },
          { id: "grilled", nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", surcharge: 0 },
        ],
        imageUrl: "/images/kampot-pepper-crab.jpg",
        tags: ["Live Tank", "Signature"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: liveTankRef.id,
        name: "Grilled Giant River Prawns",
        nameEn: "Grilled Giant River Prawns",
        nameKm: "បង្កងអាំង",
        description:
          "Live Mekong giant river prawns split and seared over hardwood charcoal with roe butter and green chili seafood dip.",
        descriptionEn:
          "Live Mekong giant river prawns split and seared over hardwood charcoal with roe butter and green chili seafood dip.",
        descriptionKm:
          "បង្កងទន្លេមេគង្គរស់ពុះអាំងលើធ្យូងឈើធម្មជាតិ ឈ្ងុយខ្លាញ់បង្កង ញ៉ាំជាមួយទឹកត្រីកោះកុង។",
        pricingType: "MARKET_PRICE" as const,
        weightUnit: "PER_KG" as const,
        priceDecimal: 0,
        marketPriceMin: 26.0,
        marketPriceMax: 34.0,
        variantsJson: null,
        cookingStylesJson: [
          { id: "charcoal-grill", nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", surcharge: 0 },
          { id: "garlic-butter", nameKm: "អាំងប័រខ្ទឹមស", nameEn: "Garlic Butter Grill", surcharge: 2.0 },
          { id: "tamarind-prawn", nameKm: "ឆាអំពិលទុំ", nameEn: "Tamarind Sauce", surcharge: 2.0 },
        ],
        imageUrl: "/images/grilled-river-prawns.jpg",
        tags: ["Live Tank", "Signature"],
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: liveTankRef.id,
        name: "Steamed Grouper with Soy & Ginger",
        nameEn: "Steamed Grouper with Soy & Ginger",
        nameKm: "ត្រីតុកកែចំហុយស៊ីអ៊ីវ",
        description:
          "Whole live tiger grouper steamed to order with julienned young ginger, scallion threads, and house superior soy.",
        descriptionEn:
          "Whole live tiger grouper steamed to order with julienned young ginger, scallion threads, and house superior soy.",
        descriptionKm:
          "ត្រីតុកកែរស់ទាំងមូលចំហុយភ្លាមៗ ជាមួយខ្ញីខ្ចី ស្លឹកខ្ទឹម និង ទឹកស៊ីអ៊ីវពិសេសប្រចាំហាង។",
        pricingType: "WEIGHT_BASED" as const,
        weightUnit: "PER_KG" as const,
        priceDecimal: 28.0,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: [
          { id: "steamed-soy", nameKm: "ចំហុយស៊ីអ៊ីវ", nameEn: "Steamed with Soy & Ginger", surcharge: 0 },
          { id: "steamed-lime", nameKm: "ចំហុយក្រូចឆ្មាម្ទេស", nameEn: "Steamed Chili & Lime", surcharge: 1.5 },
          { id: "crispy-tamarind", nameKm: "បំពងស្រួយទឹកអំពិលទុំ", nameEn: "Crispy Tamarind Glaze", surcharge: 2.0 },
        ],
        imageUrl: null,
        tags: ["Live Tank", "Fresh Catch", "Gluten-Free"],
        isAvailable: true,
        sortOrder: 2,
      },
      {
        categoryId: liveTankRef.id,
        name: "Blanched Blood Cockles",
        nameEn: "Blanched Blood Cockles",
        nameKm: "ងាវស្រុះ",
        description:
          "Quick-blanched coastal blood cockles served rare or medium with crushed roasted peanut tamarind dip.",
        descriptionEn:
          "Quick-blanched coastal blood cockles served rare or medium with crushed roasted peanut tamarind dip.",
        descriptionKm:
          "ងាវស្រស់ស្រុះល្មម ញ៉ាំផ្ទាប់ជាមួយទឹកអំពិលទុំសណ្តែកដីលីង។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 6.5,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Fresh Catch"],
        isAvailable: false,
        sortOrder: 3,
      },
      {
        categoryId: coldPlatesRef.id,
        name: "Koh Kong Raw Shrimp",
        nameEn: "Koh Kong Raw Shrimp",
        nameKm: "ភ្លាបង្គាកោះកុង",
        description:
          "Chilled sweet sea prawns marinated in fresh lime juice, bird's eye chili, raw garlic, and bitter melon slices.",
        descriptionEn:
          "Chilled sweet sea prawns marinated in fresh lime juice, bird's eye chili, raw garlic, and bitter melon slices.",
        descriptionKm:
          "បង្គាស្រស់ផ្អែមត្រជាក់ លាយទឹកត្រីកោះកុង ម្ទេសហឹរ ខ្ទឹមស និង ម្រះស្រួយ។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 9.5,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Fresh Catch", "Spicy", "Signature"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: coldPlatesRef.id,
        name: "Green Mango & Squid Salad",
        nameEn: "Green Mango & Squid Salad",
        nameKm: "ញាំមឹកស្វាយខ្ចី",
        description:
          "Tender poached coastal squid tossed with shredded green mango, shallots, mint, and toasted cashews.",
        descriptionEn:
          "Tender poached coastal squid tossed with shredded green mango, shallots, mint, and toasted cashews.",
        descriptionKm:
          "មឹកស្រស់ស្រុះញាំជាមួយស្វាយខ្ចី ខ្ទឹមក្រហម ជីអង្កាម និង គ្រាប់ស្វាយចន្ទីលីង។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 8.0,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Fresh Catch", "Spicy"],
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: riceNoodleRef.id,
        name: "Seafood Fried Rice",
        nameEn: "Seafood Fried Rice",
        nameKm: "បាយឆាគ្រឿងសមុទ្រ",
        description:
          "Smoky jasmine rice wok-fried with sea prawns, squid rings, lump crab meat, spring onion, and farm egg.",
        descriptionEn:
          "Smoky jasmine rice wok-fried with sea prawns, squid rings, lump crab meat, spring onion, and farm egg.",
        descriptionKm:
          "បាយអង្ករផ្កាម្លិះឆាភ្លើងធំឈ្ងុយ ជាមួយបង្គា មឹក សាច់ក្តាម ស្លឹកខ្ទឹម និង ពងមាន់។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 6.5,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: [
          { label: "Small (1–2 pax)", labelKm: "ចានតូច (១-២ នាក់)", price: 6.5 },
          { label: "Large (3–4 pax)", labelKm: "ចានធំ (៣-៤ នាក់)", price: 11.5 },
        ],
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Signature"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: riceNoodleRef.id,
        name: "Claypot Crab Glass Noodles",
        nameEn: "Claypot Crab Glass Noodles",
        nameKm: "មីសួឆ្នាំងដីក្តាម",
        description:
          "Mung bean glass noodles slow-steamed in a hot claypot with white pepper, ginger root, celery, and sweet crab.",
        descriptionEn:
          "Mung bean glass noodles slow-steamed in a hot claypot with white pepper, ginger root, celery, and sweet crab.",
        descriptionKm:
          "មីសួអប់ក្នុងឆ្នាំងដីក្តៅៗ ជាមួយសាច់ក្តាម ម្រេចស ខ្ញី និង គិនឆាយឈ្ងុយ។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 12.5,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Signature"],
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: drinksRef.id,
        name: "Fresh Young Coconut",
        nameEn: "Fresh Young Coconut",
        nameKm: "ទឹកដូងស្រស់",
        description: "Chilled whole fragrant coconut cracked to order.",
        descriptionEn: "Chilled whole fragrant coconut cracked to order.",
        descriptionKm: "ដូងក្រអូបត្រជាក់កាប់ស្រស់ៗភ្លាមៗ។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 2.5,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Vegetarian", "Gluten-Free"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: drinksRef.id,
        name: "Iced Honey Lime Tea",
        nameEn: "Iced Honey Lime Tea",
        nameKm: "តែក្រូចឆ្មាទឹកឃ្មុំ",
        description:
          "Cold-brewed jasmine tea shaken with Mondulkiri wild honey and fresh Cambodian lime.",
        descriptionEn:
          "Cold-brewed jasmine tea shaken with Mondulkiri wild honey and fresh Cambodian lime.",
        descriptionKm:
          "តែម្លិះត្រជាក់ក្រឡុកជាមួយទឹកឃ្មុំព្រៃមណ្ឌលគិរី និង ក្រូចឆ្មាស្រស់។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 2.25,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Vegetarian"],
        isAvailable: true,
        sortOrder: 1,
      },
    ];

    for (const item of soraItems) {
      batch.set(menuItemsCol(soraId).doc(), {
        tenantId: soraId,
        ...item,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }

  // ==========================================================================
  // 3. Venue 2: Kep Bay Kitchen (Kep Coast — KHR Primary + Dual USD)
  // ==========================================================================
  const kepId = await upsertTenant({
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
    tenantId: kepId,
  });

  const kepPresetCount = (await cookingStylesCol(kepId).count().get()).data().count;
  if (kepPresetCount === 0) {
    const batch = db.batch();
    [
      { nameKm: "ឆាម្រេចខ្ចីកំពត", nameEn: "Green Kampot Pepper", defaultSurcharge: 0 },
      { nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", defaultSurcharge: 0 },
      { nameKm: "ចំហុយគល់ស្លឹកគ្រៃ", nameEn: "Steamed Lemongrass", defaultSurcharge: 0 },
      { nameKm: "ឆាអំពិលទុំ", nameEn: "Tamarind Glaze", defaultSurcharge: 6000 },
    ].forEach((p, idx) => {
      batch.set(cookingStylesCol(kepId).doc(), {
        tenantId: kepId,
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

  const kepCatCount = (await categoriesCol(kepId).count().get()).data().count;
  if (kepCatCount === 0) {
    const batch = db.batch();
    const crabShellRef = categoriesCol(kepId).doc();
    const coastalPlatesRef = categoriesCol(kepId).doc();
    const refreshRef = categoriesCol(kepId).doc();

    batch.set(crabShellRef, {
      tenantId: kepId,
      name: "Kep Crab & Shellfish",
      nameEn: "Kep Crab & Shellfish",
      nameKm: "ក្តាមសេះ និង គ្រឿងសមុទ្រ",
      sortOrder: 0,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(coastalPlatesRef, {
      tenantId: kepId,
      name: "Soups & Rice",
      nameEn: "Soups & Rice",
      nameKm: "សម្ល និង បាយឆា",
      sortOrder: 1,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(refreshRef, {
      tenantId: kepId,
      name: "Coastal Drinks",
      nameEn: "Coastal Drinks",
      nameKm: "ភេសជ្ជៈ",
      sortOrder: 2,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });

    const kepItems = [
      {
        categoryId: crabShellRef.id,
        name: "Kep Blue Swimmer Crab with Green Pepper",
        nameEn: "Kep Blue Swimmer Crab with Green Pepper",
        nameKm: "ក្តាមសេះឆាម្រេចខ្ចី",
        description:
          "Morning-caught Kep blue swimmer crab flash-fried with freshly picked green peppercorns from nearby Kampot farms.",
        descriptionEn:
          "Morning-caught Kep blue swimmer crab flash-fried with freshly picked green peppercorns from nearby Kampot farms.",
        descriptionKm:
          "ក្តាមសេះស្រស់ចាប់នៅពេលព្រឹក ឆាជាមួយម្រេចខ្ចីស្រស់ពីចម្ការកំពត។",
        pricingType: "WEIGHT_BASED" as const,
        weightUnit: "PER_500G" as const,
        priceDecimal: 65000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: [
          { id: "kep-pepper", nameKm: "ឆាម្រេចខ្ចីកំពត", nameEn: "Green Kampot Pepper", surcharge: 0 },
          { id: "kep-steam", nameKm: "ចំហុយគល់ស្លឹកគ្រៃ", nameEn: "Steamed Lemongrass", surcharge: 0 },
          { id: "kep-tamarind", nameKm: "ឆាអំពិលទុំ", nameEn: "Tamarind Glaze", surcharge: 6000 },
        ],
        imageUrl: null,
        tags: ["Fresh Catch", "Signature"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: crabShellRef.id,
        name: "Charcoal-Grilled Baby Squid",
        nameEn: "Charcoal-Grilled Baby Squid",
        nameKm: "មឹកអាំងទឹកត្រីកោះកុង",
        description:
          "Whole tender baby squid brushed with fish sauce and grilled over coconut husks, served with spicy lime dip.",
        descriptionEn:
          "Whole tender baby squid brushed with fish sauce and grilled over coconut husks, served with spicy lime dip.",
        descriptionKm:
          "មឹកកូនស្រស់លាបទឹកត្រីអាំងធ្យូងត្រឡោកដូង ញ៉ាំជាមួយទឹកត្រីកោះកុងហឹរឆ្ងាញ់។",
        pricingType: "WEIGHT_BASED" as const,
        weightUnit: "PER_100G" as const,
        priceDecimal: 12000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Fresh Catch", "Spicy"],
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: crabShellRef.id,
        name: "Live Coastal Tiger Prawns",
        nameEn: "Live Coastal Tiger Prawns",
        nameKm: "បង្គាខ្លារស់",
        description:
          "Sea-caught tiger prawns kept live in aerated sea water tanks; priced daily by boat landing size.",
        descriptionEn:
          "Sea-caught tiger prawns kept live in aerated sea water tanks; priced daily by boat landing size.",
        descriptionKm:
          "បង្គាខ្លាសមុទ្ររស់ក្នុងអាងទឹកប្រៃ តម្លៃប្រែប្រួលតាមទំហំ និង ថ្ងៃនេសាទ។",
        pricingType: "MARKET_PRICE" as const,
        weightUnit: "PER_KG" as const,
        priceDecimal: 0,
        marketPriceMin: 95000,
        marketPriceMax: 125000,
        variantsJson: null,
        cookingStylesJson: [
          { id: "prawn-grill", nameKm: "អាំងធ្យូង", nameEn: "Charcoal Grilled", surcharge: 0 },
          { id: "prawn-salt-chili", nameKm: "លីងអំបិលម្ទេស", nameEn: "Salt & Chili Roast", surcharge: 5000 },
        ],
        imageUrl: null,
        tags: ["Live Tank"],
        isAvailable: true,
        sortOrder: 2,
      },
      {
        categoryId: crabShellRef.id,
        name: "Grilled Sea Snails",
        nameEn: "Grilled Sea Snails",
        nameKm: "ខ្យងហូលអាំង",
        description:
          "Wild coastal sea snails grilled in shell with green pepper and scallion oil.",
        descriptionEn:
          "Wild coastal sea snails grilled in shell with green pepper and scallion oil.",
        descriptionKm:
          "ខ្យងហូលសមុទ្រអាំងជាមួយប្រេងស្លឹកខ្ទឹម និង ម្រេចខ្ចី។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 22000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Fresh Catch"],
        isAvailable: false,
        sortOrder: 3,
      },
      {
        categoryId: coastalPlatesRef.id,
        name: "Coastal Fish Sour Herb Soup",
        nameEn: "Coastal Fish Sour Herb Soup",
        nameKm: "សម្លម្ជូរគ្រឿងត្រីសមុទ្រ",
        description:
          "Fragrant Khmer kroeung broth simmered with reef fish, young tamarind leaves, water lily stems, and sawtooth herb.",
        descriptionEn:
          "Fragrant Khmer kroeung broth simmered with reef fish, young tamarind leaves, water lily stems, and sawtooth herb.",
        descriptionKm:
          "សម្លម្ជូរគ្រឿងត្រីសមុទ្រស្រស់ ដាក់ស្លឹកអំពិលខ្ចី ព្រលិត និង ជីរណាឈ្ងុយ។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 38000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: [
          { label: "Small Pot", labelKm: "ឆ្នាំងតូច", price: 38000 },
          { label: "Family Pot", labelKm: "ឆ្នាំងធំ", price: 68000 },
        ],
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Signature"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: coastalPlatesRef.id,
        name: "Kep Crab Fried Rice",
        nameEn: "Kep Crab Fried Rice",
        nameKm: "បាយឆាក្តាមកែប",
        description:
          "Hand-picked sweet crab meat tossed with fragrant jasmine rice, egg, and fresh Kampot pepper.",
        descriptionEn:
          "Hand-picked sweet crab meat tossed with fragrant jasmine rice, egg, and fresh Kampot pepper.",
        descriptionKm:
          "បាយឆាសាច់ក្តាមកែបផ្អែម ជាមួយពងមាន់ និង ម្រេចកំពតឈ្ងុយ។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 28000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Signature"],
        isAvailable: true,
        sortOrder: 1,
      },
      {
        categoryId: refreshRef.id,
        name: "Chilled Fresh Palm Juice",
        nameEn: "Chilled Fresh Palm Juice",
        nameKm: "ទឹកត្នោតស្រស់ត្រជាក់",
        description: "Naturally sweet morning-tapped sugar palm juice served over ice.",
        descriptionEn: "Naturally sweet morning-tapped sugar palm juice served over ice.",
        descriptionKm: "ទឹកត្នោតផ្អែមធម្មជាតិដងពេលព្រឹក ដាក់ទឹកកកត្រជាក់។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 6000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Vegetarian"],
        isAvailable: true,
        sortOrder: 0,
      },
      {
        categoryId: refreshRef.id,
        name: "Cambodian Iced Milk Coffee",
        nameEn: "Cambodian Iced Milk Coffee",
        nameKm: "កាហ្វេទឹកដោះគោទឹកកក",
        description: "Dark roasted Mondulkiri coffee dripped slow over condensed milk and crushed ice.",
        descriptionEn: "Dark roasted Mondulkiri coffee dripped slow over condensed milk and crushed ice.",
        descriptionKm: "កាហ្វេលីងមណ្ឌលគិរីឆុងជាមួយទឹកដោះគោខាប់ និង ទឹកកកឈូស។",
        pricingType: "FIXED" as const,
        weightUnit: null,
        priceDecimal: 8000,
        marketPriceMin: null,
        marketPriceMax: null,
        variantsJson: null,
        cookingStylesJson: null,
        imageUrl: null,
        tags: ["Vegetarian"],
        isAvailable: true,
        sortOrder: 1,
      },
    ];

    for (const item of kepItems) {
      batch.set(menuItemsCol(kepId).doc(), {
        tenantId: kepId,
        ...item,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }

  // 4. Sample Scan Events
  const soraScans = (await scanEventsCol(soraId).count().get()).data().count;
  const kepScans = (await scanEventsCol(kepId).count().get()).data().count;
  if (soraScans === 0 && kepScans === 0) {
    const batch = db.batch();
    const nowMs = Date.now();
    const hour = 60 * 60 * 1000;
    const soraTables = ["01", "02", "05", "05", "05", "08", "VIP-1", null];
    const kepTables = ["01", "03", "04", "04", "DECK-2", null];

    for (let i = 0; i < 42; i++) {
      batch.set(scanEventsCol(soraId).doc(), {
        tenantId: soraId,
        tableCode: soraTables[i % soraTables.length] ?? null,
        userAgent: null,
        scannedAt: new Date(nowMs - i * 3.8 * hour),
      });
    }
    for (let i = 0; i < 28; i++) {
      batch.set(scanEventsCol(kepId).doc(), {
        tenantId: kepId,
        tableCode: kepTables[i % kepTables.length] ?? null,
        userAgent: null,
        scannedAt: new Date(nowMs - i * 5.2 * hour),
      });
    }
    await batch.commit();
    console.log("✓ Seeded 70 Cambodian dining QR scan events");
  }

  console.log("✓ Cloud Firestore seed complete:");
  console.log("  Super Admin: admin@menuos.app / Admin123!");
  console.log("  Venue 1 (/m/sora-seafood-grill, USD+KHR): owner@soraseafood.com / Menu123!");
  console.log("  Venue 2 (/m/kep-bay-kitchen, KHR+USD): chef@kepbaykitchen.com / Menu123!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
