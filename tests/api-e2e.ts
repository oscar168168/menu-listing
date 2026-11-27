try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}

import assert from "node:assert/strict";
import {
  categoriesCol,
  cookingStylesCol,
  FieldValue,
  findTenantBySlug,
  findUserByEmail,
  formatCambodiaDateKey,
  getDb,
  menuItemsCol,
  scanEventsCol,
  scanStatsCol,
  tenantDoc,
  tenantSlugsCol,
  usersCol,
} from "../src/lib/firestore";
import { computeThemeContrast } from "../src/lib/theme";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

class CookieJar {
  private cookies = new Map<string, string>();

  capture(res: Response) {
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const firstPart = raw.split(";")[0];
      if (!firstPart) continue;
      const eqIdx = firstPart.indexOf("=");
      if (eqIdx === -1) continue;
      const key = firstPart.slice(0, eqIdx).trim();
      const val = firstPart.slice(eqIdx + 1).trim();
      if (val === "" || raw.toLowerCase().includes("max-age=0")) {
        this.cookies.delete(key);
      } else {
        this.cookies.set(key, val);
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

async function req(
  path: string,
  options: RequestInit & { jar?: CookieJar } = {}
): Promise<Response> {
  const { jar, headers, ...rest } = options;
  const mergedHeaders = new Headers(headers);
  if (jar && jar.header()) {
    mergedHeaders.set("cookie", jar.header());
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });
  jar?.capture(res);
  return res;
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Server did not become ready in time");
}

async function run() {
  await waitForServer();
  console.log("✓ Server reachable at", BASE_URL);

  // 1. Auth guards
  const unauthAdmin = await req("/api/admin/menu");
  assert.equal(unauthAdmin.status, 401);
  const unauthSuper = await req("/api/super-admin/tenants");
  assert.equal(unauthSuper.status, 403);
  console.log("✓ Auth guards enforce 401/403");

  // 2. Public Cambodian Seafood ISR Menus (Khmer default, USD+KHR and KHR+USD, Edge/ISR cacheable across ?table=)
  const soraFound =
    (await findTenantBySlug("pak-khlang-168")) ??
    (await findTenantBySlug("sora-seafood-grill"));
  assert.ok(soraFound, "Pak Khlang / Sora Seafood Grill tenant must be seeded");
  const soraSlug = soraFound.data.slug;
  const soraTheme = computeThemeContrast(soraFound.data.primaryColor);

  const soraRes = await req(`/m/${soraSlug}?table=05`);
  assert.equal(soraRes.status, 200);
  const soraCacheControl = soraRes.headers.get("cache-control") ?? "";
  assert.ok(
    !soraCacheControl.includes("no-store"),
    `Public menu must be ISR/Edge cacheable (got Cache-Control: ${soraCacheControl})`
  );
  const soraHtml = await soraRes.text();
  assert.ok(soraHtml.includes(`--brand-primary:${soraTheme.primary}`));
  assert.ok(soraHtml.includes(`--brand-primary-foreground:${soraTheme.foreground}`));
  assert.ok(soraHtml.includes('lang="km"'), "Default menu language must be Khmer");
  assert.ok(soraHtml.includes("ក្តាមឆាម្រេចកំពត"), "Khmer dish title must render by default");
  assert.ok(soraHtml.includes("គ្រឿងសមុទ្រ"), "Seafood default category must render");
  assert.ok(soraHtml.includes("បង្គា និង បង្កង"), "Shrimp default category must render");
  assert.ok(soraHtml.includes("មឹក"), "Squid default category must render");
  assert.ok(soraHtml.includes("ស្រាបៀរ"), "Beer default category must render");
  assert.ok(soraHtml.includes("40,000 ៛"), "40,000 ៛ dish price must render");
  assert.ok(soraHtml.includes("35,000 ៛"), "35,000 ៛ dish price must render");
  assert.ok(soraHtml.includes("25,000 ៛"), "25,000 ៛ dish price must render");
  if (soraFound.data.vendorMode === "CART") {
    assert.ok(soraHtml.includes("Add ក្តាមឆាម្រេចកំពត to cart"), "CART vendor mode must render add-to-cart controls");
  }

  // Verify subsequent QR scan with different ?table= param reuses ISR cache cleanly
  const soraSecondRes = await req(`/m/${soraSlug}?table=09`);
  assert.equal(soraSecondRes.status, 200);
  const secondNextCache = soraSecondRes.headers.get("x-nextjs-cache");
  if (secondNextCache) {
    assert.equal(secondNextCache, "HIT", "Second QR table request should hit ISR cache");
  }

  const kepFound = await findTenantBySlug("kep-bay-kitchen");
  assert.ok(kepFound, "Kep Bay Kitchen tenant must be seeded");
  const kepTheme = computeThemeContrast(kepFound.data.primaryColor);

  const kepHtml = await (await req("/m/kep-bay-kitchen?table=03")).text();
  assert.ok(kepHtml.includes(`--brand-primary:${kepTheme.primary}`));
  assert.ok(kepHtml.includes(`--brand-primary-foreground:${kepTheme.foreground}`));
  assert.ok(kepHtml.includes("ក្តាមសេះឆាម្រេចខ្ចី"), "Kep Khmer dish title must render by default");
  assert.ok(kepHtml.includes("40,000 ៛"), "Khmer menu must render KHR prices");
  assert.ok(!kepHtml.includes("$9.76"), "Khmer menu must render KHR only without USD");
  if (kepFound.data.vendorMode === "LISTING_ONLY") {
    assert.ok(!kepHtml.includes("to cart"), "LISTING_ONLY vendor mode must omit add-to-cart controls");
  }
  console.log("✓ Public Khmer-default Cambodian seafood menus (CART & LISTING_ONLY modes) render zero-FOUC + ISR");

  // 3. Scan analytics ping (non-blocking after() persistence + scanStats)
  const scansBefore = (await scanEventsCol(soraFound.id).count().get()).data().count;
  const todayKey = formatCambodiaDateKey();
  const statBeforeSnap = await scanStatsCol(soraFound.id).doc(todayKey).get();
  const e2eTableBefore = statBeforeSnap.data()?.tableCounts?.["E2E-05"] ?? 0;
  const scanRes = await req("/api/scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: soraSlug, tableCode: "E2E-05" }),
  });
  assert.equal(scanRes.status, 201);
  let scansAfter = scansBefore;
  let e2eTableAfter = e2eTableBefore;
  const scanDeadline = Date.now() + 4000;
  while (Date.now() < scanDeadline) {
    const [countSnap, statSnap] = await Promise.all([
      scanEventsCol(soraFound.id).count().get(),
      scanStatsCol(soraFound.id).doc(todayKey).get(),
    ]);
    scansAfter = countSnap.data().count;
    e2eTableAfter = statSnap.data()?.tableCounts?.["E2E-05"] ?? 0;
    if (scansAfter >= scansBefore + 1 && e2eTableAfter >= e2eTableBefore + 1) {
      break;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.equal(scansAfter, scansBefore + 1);
  assert.equal(e2eTableAfter, e2eTableBefore + 1);
  const e2eScans = await scanEventsCol(soraFound.id)
    .where("tableCode", "==", "E2E-05")
    .get();
  await Promise.all([
    ...e2eScans.docs.map((d) => d.ref.delete()),
    scanStatsCol(soraFound.id)
      .doc(todayKey)
      .update({
        totalScans: FieldValue.increment(-1),
        "tableCounts.E2E-05": FieldValue.delete(),
      })
      .catch(() => undefined),
  ]);
  console.log("✓ Non-blocking QR scan analytics ping + daily scanStats persisted");

  // 4. Sign in as Sora Menu Admin using username or phone (no OTP) & verify multi-tenant isolation against Kep Bay Kitchen
  const soraJar = new CookieJar();
  const loginSora = await req("/api/auth/login", {
    method: "POST",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "sora",
      password: "Menu123!",
    }),
  });
  assert.equal(loginSora.status, 200);

  const kepOnlyCatRef = categoriesCol(kepFound.id).doc("e2e-kep-only-cat");
  const kepOnlyItemRef = menuItemsCol(kepFound.id).doc("e2e-kep-only-item");
  const nowTs = new Date();
  await Promise.all([
    kepOnlyCatRef.set({
      tenantId: kepFound.id,
      name: "Kep Isolated Cat",
      nameKm: "Kep Isolated Cat",
      nameEn: "Kep Isolated Cat",
      sortOrder: 99,
      isVisible: false,
      pricingMode: "FIXED",
      createdAt: nowTs,
      updatedAt: nowTs,
    }),
    kepOnlyItemRef.set({
      tenantId: kepFound.id,
      categoryId: kepOnlyCatRef.id,
      name: "Kep Isolated Item",
      nameKm: "Kep Isolated Item",
      nameEn: "Kep Isolated Item",
      description: "",
      descriptionKm: null,
      descriptionEn: null,
      pricingType: "FIXED",
      weightUnit: null,
      priceDecimal: 10000,
      marketPriceMin: null,
      marketPriceMax: null,
      variantsJson: null,
      cookingStylesJson: null,
      imageUrl: null,
      tags: [],
      isAvailable: true,
      sortOrder: 0,
      createdAt: nowTs,
      updatedAt: nowTs,
    }),
  ]);

  try {
    const crossCatPatch = await req(
      `/api/admin/categories/${kepOnlyCatRef.id}`,
      {
        method: "PATCH",
        jar: soraJar,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameEn: "HACKED" }),
      }
    );
    assert.equal(crossCatPatch.status, 404);

    const crossItemPatch = await req(
      `/api/admin/items/${kepOnlyItemRef.id}`,
      {
        method: "PATCH",
        jar: soraJar,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: 1 }),
      }
    );
    assert.equal(crossItemPatch.status, 404);
  } finally {
    await Promise.all([
      kepOnlyItemRef.delete().catch(() => undefined),
      kepOnlyCatRef.delete().catch(() => undefined),
    ]);
  }
  console.log("✓ Strict multi-tenant isolation verified between Cambodian venues");

  // 5. Bilingual Seafood Item CRUD (WEIGHT_BASED + Cooking Styles + Quick Market Price switch)
  const createCatRes = await req("/api/admin/categories", {
    method: "POST",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nameKm: "អយស្ទ័រ និង គ្រំ",
      nameEn: "Oysters & Clams E2E",
      isVisible: true,
    }),
  });
  assert.equal(createCatRes.status, 201);
  const { category: tempCat } = (await createCatRes.json()) as {
    category: { id: string };
  };

  const createItemRes = await req("/api/admin/items", {
    method: "POST",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categoryId: tempCat.id,
      nameKm: "អយស្ទ័រកោះកុង",
      nameEn: "Koh Kong Live Oysters",
      descriptionKm: "អយស្ទ័រស្រស់ៗ",
      descriptionEn: "Shucked to order on crushed ice.",
      pricingType: "WEIGHT_BASED",
      weightUnit: "PER_PIECE",
      price: 2.5,
      cookingStyles: [
        { id: "raw", nameKm: "ស្រស់", nameEn: "Fresh Raw", surcharge: 0 },
        { id: "cheese", nameKm: "អាំងឈីស", nameEn: "Cheese Grilled", surcharge: 1.0 },
      ],
      tags: ["Live Tank", "Fresh Catch"],
      isAvailable: true,
    }),
  });
  assert.equal(createItemRes.status, 201);
  const { item: tempItem } = (await createItemRes.json()) as {
    item: { id: string };
  };

  // Switch to MARKET_PRICE via Quick Stock & Price PATCH
  const switchMarket = await req(`/api/admin/items/${tempItem.id}`, {
    method: "PATCH",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pricingType: "MARKET_PRICE", isAvailable: false }),
  });
  assert.equal(switchMarket.status, 200);

  // Verify public SSR menu updated immediately (renders in Khmer by default)
  const refreshedHtml = await (await req(`/m/${soraSlug}`)).text();
  assert.ok(refreshedHtml.includes("អយស្ទ័រកោះកុង"));

  // QR SVG, PNG, and Printable Table Card
  const qrPngRes = await req("/api/admin/qr?format=png&table=05", { jar: soraJar });
  assert.equal(qrPngRes.status, 200);
  const pngBytes = new Uint8Array(await qrPngRes.arrayBuffer());
  assert.equal(pngBytes[0], 0x89);
  assert.equal(pngBytes[1], 0x50);

  // Built-in Firestore Image Upload + Serving
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const uploadForm = new FormData();
  uploadForm.append(
    "file",
    new File([tinyPng], "tiny-dish.png", { type: "image/png" })
  );
  const uploadRes = await req("/api/upload", {
    method: "POST",
    jar: soraJar,
    body: uploadForm,
  });
  assert.equal(uploadRes.status, 200);
  const uploadJson = (await uploadRes.json()) as { url: string };
  assert.ok(
    uploadJson.url.startsWith(`/api/media/${soraFound.id}/`),
    "Upload must return built-in Firestore media URL"
  );
  const mediaRes = await req(uploadJson.url);
  assert.equal(mediaRes.status, 200);
  assert.equal(mediaRes.headers.get("content-type"), "image/png");
  const servedBytes = new Uint8Array(await mediaRes.arrayBuffer());
  assert.equal(servedBytes[0], 0x89);
  assert.equal(servedBytes[1], 0x50);

  // Attach uploaded media to tempItem so category cascade DELETE verifies orphaned media cleanup
  const attachMediaRes = await req(`/api/admin/items/${tempItem.id}`, {
    method: "PATCH",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: uploadJson.url }),
  });
  assert.equal(attachMediaRes.status, 200);

  // Verify category reorder endpoint (single getAll RPC)
  const soraMenuRes = await req("/api/admin/menu", { jar: soraJar });
  assert.equal(soraMenuRes.status, 200);
  const soraMenuJson = (await soraMenuRes.json()) as {
    categories: Array<{ id: string }>;
  };
  const reorderIds = soraMenuJson.categories.map((c) => c.id);
  const reorderRes = await req("/api/admin/categories/reorder", {
    method: "PATCH",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds: reorderIds }),
  });
  assert.equal(reorderRes.status, 200);

  // Clean up temp category (cascade deletes tempItem and orphaned Firestore media)
  const delCatRes = await req(`/api/admin/categories/${tempCat.id}`, {
    method: "DELETE",
    jar: soraJar,
  });
  assert.equal(delCatRes.status, 200);
  const mediaAfterDelete = await req(uploadJson.url);
  assert.equal(
    mediaAfterDelete.status,
    404,
    "Deleting category must cascade-clean orphaned Firestore media"
  );
  console.log("✓ Bilingual seafood CRUD, weight/market pricing, cooking styles, and QR exports passed");

  // 6. Super Admin Provisioning, Suspension & Impersonation
  const superJar = new CookieJar();
  const loginSuper = await req("/api/auth/login", {
    method: "POST",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "admin",
      password: "Admin123!",
    }),
  });
  assert.equal(loginSuper.status, 200);

  const testSlug = `e2e-kampot-${Date.now().toString().slice(-4)}`;
  const testEmail = `012${Date.now().toString().slice(-6)}`;
  const provRes = await req("/api/super-admin/tenants", {
    method: "POST",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Kampot River Grill",
      nameKm: "កំពត រីវើ គ្រីល",
      slug: testSlug,
      currency: "KHR",
      primaryColor: "#14532D",
      ownerName: "Vannak",
      ownerUsername: testSlug,
      ownerPhone: testEmail,
      ownerPassword: "TestPassword123!",
    }),
  });
  assert.equal(provRes.status, 201);
  const {
    tenantId: provTenantId,
    summary: provSummary,
    analyticsRow: provAnalytics,
  } = (await provRes.json()) as {
    tenantId: string;
    summary: { id: string; slug: string; categoryCount: number };
    analyticsRow: { tenantId: string; totalScans: number };
  };
  assert.equal(provSummary.id, provTenantId);
  assert.equal(provSummary.slug, testSlug);
  assert.equal(provSummary.categoryCount, 9);
  assert.equal(provAnalytics.tenantId, provTenantId);

  const superDashRes = await req("/api/super-admin/tenants", { jar: superJar });
  assert.equal(superDashRes.status, 200);

  // Verify default cooking styles were auto-seeded for the provisioned venue
  const presetCount = (await cookingStylesCol(provTenantId).count().get()).data().count;
  assert.ok(presetCount >= 5, "Provisioned Cambodian venue should receive preset cooking styles");

  // Edit venue slug & bilingual names via Super Admin PATCH
  const renamedSlug = `${testSlug}-edited`;
  const editSlugRes = await req(`/api/super-admin/tenants/${provTenantId}`, {
    method: "PATCH",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: renamedSlug,
      nameEn: "Kampot River Grill 168",
      nameKm: "កំពត រីវើ គ្រីល 168",
    }),
  });
  assert.equal(editSlugRes.status, 200);
  const editSlugJson = (await editSlugRes.json()) as {
    tenant: { slug: string; nameEn: string; nameKm: string };
  };
  assert.equal(editSlugJson.tenant.slug, renamedSlug);
  assert.equal(editSlugJson.tenant.nameKm, "កំពត រីវើ គ្រីល 168");

  // Suspend -> public screen shows unavailable on the updated slug
  const suspendRes = await req(`/api/super-admin/tenants/${provTenantId}`, {
    method: "PATCH",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "SUSPENDED" }),
  });
  assert.equal(suspendRes.status, 200);
  const suspendedHtml = await (await req(`/m/${renamedSlug}`)).text();
  assert.ok(suspendedHtml.includes("Menu temporarily unavailable"));

  // Impersonate Kep Bay Kitchen
  const impRes = await req("/api/super-admin/impersonate", {
    method: "POST",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: kepFound.id }),
  });
  assert.equal(impRes.status, 200);
  const impMenu = (await (
    await req("/api/admin/menu", { jar: superJar })
  ).json()) as { tenant: { slug: string; currency: string }; isImpersonating: boolean };
  assert.equal(impMenu.tenant.slug, "kep-bay-kitchen");
  assert.equal(impMenu.tenant.currency, "KHR");
  assert.equal(impMenu.isImpersonating, true);

  // Cleanup
  await req("/api/super-admin/impersonate", { method: "DELETE", jar: superJar });
  const testUser = await findUserByEmail(testEmail);
  if (testUser) {
    await usersCol().doc(testUser.id).delete();
  }
  await getDb().recursiveDelete(tenantDoc(provTenantId));
  await tenantSlugsCol().doc(renamedSlug).delete().catch(() => undefined);
  console.log("✓ Super Admin bilingual provisioning, suspension, and impersonation passed");

  console.log("\nALL CAMBODIAN SEAFOOD + CLOUD FIRESTORE E2E CHECKS PASSED!");
}

run().catch((err) => {
  console.error("E2E FAILURE:", err);
  process.exit(1);
});
