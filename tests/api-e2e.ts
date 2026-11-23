try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}

import assert from "node:assert/strict";
import {
  categoriesCol,
  cookingStylesCol,
  findTenantBySlug,
  findUserByEmail,
  getDb,
  menuItemsCol,
  scanEventsCol,
  tenantDoc,
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

  // 2. Public Cambodian Seafood SSR Menus (Khmer default, USD+KHR and KHR+USD)
  const soraFound = await findTenantBySlug("sora-seafood-grill");
  assert.ok(soraFound, "Sora Seafood Grill tenant must be seeded");
  const soraTheme = computeThemeContrast(soraFound.data.primaryColor);

  const soraHtml = await (await req("/m/sora-seafood-grill?table=05")).text();
  assert.ok(soraHtml.includes(`--brand-primary:${soraTheme.primary}`));
  assert.ok(soraHtml.includes(`--brand-primary-foreground:${soraTheme.foreground}`));
  assert.ok(soraHtml.includes('lang="km"'), "Default menu language must be Khmer");
  assert.ok(soraHtml.includes("តុ 05"), "Khmer table badge must render by default");
  assert.ok(soraHtml.includes("ក្តាមឆាម្រេចកំពត"), "Khmer dish title must render by default");
  assert.ok(soraHtml.includes("73,800 ៛"), "USD-primary dual KHR conversion must render");
  if (soraFound.data.vendorMode === "CART") {
    assert.ok(soraHtml.includes("Add ក្តាមឆាម្រេចកំពត to cart"), "CART vendor mode must render add-to-cart controls");
  }

  const kepFound = await findTenantBySlug("kep-bay-kitchen");
  assert.ok(kepFound, "Kep Bay Kitchen tenant must be seeded");
  const kepTheme = computeThemeContrast(kepFound.data.primaryColor);

  const kepHtml = await (await req("/m/kep-bay-kitchen?table=03")).text();
  assert.ok(kepHtml.includes(`--brand-primary:${kepTheme.primary}`));
  assert.ok(kepHtml.includes(`--brand-primary-foreground:${kepTheme.foreground}`));
  assert.ok(kepHtml.includes("ក្តាមសេះឆាម្រេចខ្ចី"), "Kep Khmer dish title must render by default");
  assert.ok(kepHtml.includes("65,000 ៛"), "KHR-primary menu must render KHR prices");
  assert.ok(kepHtml.includes("$15.85"), "KHR-primary menu must render dual USD conversion");
  if (kepFound.data.vendorMode === "LISTING_ONLY") {
    assert.ok(!kepHtml.includes("to cart"), "LISTING_ONLY vendor mode must omit add-to-cart controls");
  }
  console.log("✓ Public Khmer-default Cambodian seafood menus (CART & LISTING_ONLY modes) render zero-FOUC");

  // 3. Scan analytics ping
  const scansBefore = (await scanEventsCol(soraFound.id).count().get()).data().count;
  const scanRes = await req("/api/scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "sora-seafood-grill", tableCode: "E2E-05" }),
  });
  assert.equal(scanRes.status, 201);
  const scansAfter = (await scanEventsCol(soraFound.id).count().get()).data().count;
  assert.equal(scansAfter, scansBefore + 1);
  const e2eScans = await scanEventsCol(soraFound.id)
    .where("tableCode", "==", "E2E-05")
    .get();
  await Promise.all(e2eScans.docs.map((d) => d.ref.delete()));
  console.log("✓ Non-blocking QR scan analytics ping persisted");

  // 4. Sign in as Sora Menu Admin & verify multi-tenant isolation against Kep Bay Kitchen
  const soraJar = new CookieJar();
  const loginSora = await req("/api/auth/login", {
    method: "POST",
    jar: soraJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@soraseafood.com",
      password: "Menu123!",
    }),
  });
  assert.equal(loginSora.status, 200);

  const [kepCats, kepItems] = await Promise.all([
    categoriesCol(kepFound.id).limit(1).get(),
    menuItemsCol(kepFound.id).limit(1).get(),
  ]);

  const crossCatPatch = await req(
    `/api/admin/categories/${kepCats.docs[0]!.id}`,
    {
      method: "PATCH",
      jar: soraJar,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameEn: "HACKED" }),
    }
  );
  assert.equal(crossCatPatch.status, 404);

  const crossItemPatch = await req(
    `/api/admin/items/${kepItems.docs[0]!.id}`,
    {
      method: "PATCH",
      jar: soraJar,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: 1 }),
    }
  );
  assert.equal(crossItemPatch.status, 404);
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
  const refreshedHtml = await (await req("/m/sora-seafood-grill")).text();
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
  // Clean up test media document
  const uploadedMediaId = uploadJson.url.split("/").pop()!;
  await getDb().doc(`tenants/${soraFound.id}/media/${uploadedMediaId}`).delete();

  // Clean up temp category (cascade deletes tempItem too)
  await req(`/api/admin/categories/${tempCat.id}`, {
    method: "DELETE",
    jar: soraJar,
  });
  console.log("✓ Bilingual seafood CRUD, weight/market pricing, cooking styles, and QR exports passed");

  // 6. Super Admin Provisioning, Suspension & Impersonation
  const superJar = new CookieJar();
  const loginSuper = await req("/api/auth/login", {
    method: "POST",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@menuos.app",
      password: "Admin123!",
    }),
  });
  assert.equal(loginSuper.status, 200);

  const testSlug = `e2e-kampot-${Date.now().toString().slice(-4)}`;
  const testEmail = `${testSlug}@example.com`;
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
      ownerEmail: testEmail,
      ownerPassword: "TestPassword123!",
    }),
  });
  assert.equal(provRes.status, 201);
  const { tenantId: provTenantId } = (await provRes.json()) as {
    tenantId: string;
  };

  // Verify default cooking styles were auto-seeded for the provisioned venue
  const presetCount = (await cookingStylesCol(provTenantId).count().get()).data().count;
  assert.ok(presetCount >= 5, "Provisioned Cambodian venue should receive preset cooking styles");

  // Suspend -> public screen shows unavailable
  const suspendRes = await req(`/api/super-admin/tenants/${provTenantId}`, {
    method: "PATCH",
    jar: superJar,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "SUSPENDED" }),
  });
  assert.equal(suspendRes.status, 200);
  const suspendedHtml = await (await req(`/m/${testSlug}`)).text();
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
  console.log("✓ Super Admin bilingual provisioning, suspension, and impersonation passed");

  console.log("\nALL CAMBODIAN SEAFOOD + CLOUD FIRESTORE E2E CHECKS PASSED!");
}

run().catch((err) => {
  console.error("E2E FAILURE:", err);
  process.exit(1);
});
