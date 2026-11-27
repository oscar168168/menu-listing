import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildUserLoginKeys,
  expandIdentifierLookupCandidates,
  extractFirestoreMediaId,
  formatCambodiaDateKey,
} from "../src/lib/firestore";
import {
  isFreshSeafoodCategory,
  resolveCategoryPricingMode,
} from "../src/lib/i18n";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../src/lib/validation";

describe("Firestore lookup & media cleanup helpers", () => {
  it("builds normalized loginKeys for email, username, local-part, and Cambodian phones", () => {
    const keys = buildUserLoginKeys({
      email: "Owner@SoraSeafood.com",
      username: "Sora",
      phone: "+855 93 765 166",
    });

    assert.ok(keys.includes("sora"));
    assert.ok(keys.includes("owner@soraseafood.com"));
    assert.ok(keys.includes("owner"));
    assert.ok(keys.includes("093765166"));
    assert.ok(keys.includes("85593765166"));
  });

  it("expands identifier lookup candidates consistently", () => {
    const fromSpacedPhone = expandIdentifierLookupCandidates("+855 93-765-166");
    assert.ok(fromSpacedPhone.includes("093765166"));
    assert.ok(fromSpacedPhone.includes("85593765166"));
    assert.ok(fromSpacedPhone.includes("owner@soraseafood.com"));

    const fromAlias = expandIdentifierLookupCandidates("SORA");
    assert.ok(fromAlias.includes("sora"));
    assert.ok(fromAlias.includes("owner@soraseafood.com"));
  });

  it("extracts built-in Firestore media IDs only within the owning tenant", () => {
    assert.equal(
      extractFirestoreMediaId("/api/media/tenant_1/img_abc123", "tenant_1"),
      "img_abc123"
    );
    assert.equal(
      extractFirestoreMediaId("/api/media/tenant_1/img_abc123?v=2", "tenant_1"),
      "img_abc123"
    );
    assert.equal(
      extractFirestoreMediaId("/api/media/tenant_2/img_abc123", "tenant_1"),
      null
    );
    assert.equal(
      extractFirestoreMediaId("/api/media/tenant_1/../secret", "tenant_1"),
      null
    );
    assert.equal(
      extractFirestoreMediaId("https://res.cloudinary.com/demo/image.jpg", "tenant_1"),
      null
    );
  });

  it("formats scanStats date keys in Cambodia timezone (UTC+7)", () => {
    // 2026-11-26T17:30:00Z is 2026-11-27T00:30:00+07:00 in Cambodia
    const utcEvening = new Date("2026-11-26T17:30:00.000Z");
    assert.equal(formatCambodiaDateKey(utcEvening), "2026-11-27");
  });
});

describe("Category pricingMode resolution & schema", () => {
  it("respects explicit category pricingMode over name heuristics and falls back cleanly", () => {
    assert.equal(
      resolveCategoryPricingMode({
        id: "default-cat-fresh",
        pricingMode: "FIXED",
        nameEn: "Fresh Seafood",
      }),
      "FIXED"
    );
    assert.equal(
      resolveCategoryPricingMode({
        id: "cat_custom_tank",
        pricingMode: "WEIGHT_BASED",
        nameEn: "Live Tank",
      }),
      "WEIGHT_BASED"
    );
    assert.equal(
      isFreshSeafoodCategory({ id: "default-cat-fresh", nameEn: "Fresh Seafood" }),
      true
    );
    assert.equal(
      isFreshSeafoodCategory({ id: "default-cat-crab", nameEn: "Crab" }),
      false
    );
  });

  it("validates optional pricingMode in category create & update schemas", () => {
    const created = createCategorySchema.parse({
      nameKm: "គ្រឿងសមុទ្ររស់",
      nameEn: "Live Tank",
      pricingMode: "WEIGHT_BASED",
    });
    assert.equal(created.pricingMode, "WEIGHT_BASED");

    const updated = updateCategorySchema.parse({ pricingMode: "FIXED" });
    assert.equal(updated.pricingMode, "FIXED");
  });
});
