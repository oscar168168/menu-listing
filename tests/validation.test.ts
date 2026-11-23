import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMenuItemSchema,
  hexColorSchema,
  provisionTenantSchema,
  slugify,
} from "../src/lib/validation";

describe("Validation schemas", () => {
  it("slugifies accented and spaced venue names cleanly", () => {
    assert.equal(slugify("Kōhī & Bakehouse"), "kohi-bakehouse");
    assert.equal(slugify("  Osteria  Sole!! "), "osteria-sole");
  });

  it("normalizes valid hex colors and rejects invalid ones", () => {
    assert.equal(hexColorSchema.parse("#f0a"), "#FF00AA");
    assert.throws(() => hexColorSchema.parse("rgb(0,0,0)"));
  });

  it("validates menu items with variants and defaults", () => {
    const parsed = createMenuItemSchema.parse({
      categoryId: "cat_1",
      name: "Oat Cortado",
      price: "5.25",
      variants: [
        { label: "Hot", price: "5.25" },
        { label: "Iced", price: 5.5 },
      ],
      tags: ["Signature", "Vegan"],
    });
    assert.equal(parsed.price, 5.25);
    assert.equal(parsed.variants.length, 2);
    assert.equal(parsed.isAvailable, true);
    assert.equal(parsed.imageUrl, null);
  });

  it("rejects invalid slugs when provisioning a tenant", () => {
    assert.throws(() =>
      provisionTenantSchema.parse({
        name: "Test Cafe",
        slug: "Invalid Slug!",
        ownerName: "Owner",
        ownerEmail: "owner@example.com",
        ownerPassword: "password123",
      })
    );
  });
});
