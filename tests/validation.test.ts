import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMenuItemSchema,
  hexColorSchema,
  loginSchema,
  provisionTenantSchema,
  slugify,
  updateThemeSchema,
} from "../src/lib/validation";

describe("Validation schemas", () => {
  it("slugifies accented and spaced venue names cleanly", () => {
    assert.equal(slugify("Kōhī & Bakehouse"), "kohi-bakehouse");
    assert.equal(slugify("  Osteria  Sole!! "), "osteria-sole");
  });

  it("validates username or phone login without OTP", () => {
    const byUsername = loginSchema.parse({
      identifier: "sora",
      password: "Menu123!",
    });
    assert.equal(byUsername.identifier, "sora");

    const byPhone = loginSchema.parse({
      phone: "093 765 166",
      password: "Menu123!",
    });
    assert.equal(byPhone.identifier, "093 765 166");
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

  it("accepts multi-number phones and encoded Facebook & Google Maps URLs in theme settings", () => {
    const phone =
      "093 765 166 / 071 886 0606 / 088 9252 222 / 096 6199 770";
    const facebookUrl =
      "https://www.facebook.com/p/%E1%9E%86%E1%9F%92%E1%9E%93%E1%9F%81%E1%9E%9A%E1%9E%94%E1%9F%89%E1%9E%B6%E1%9E%80%E1%9F%8B%E1%9E%81%E1%9F%92%E1%9E%9B%E1%9E%84-168-100069414237223/?locale=km_KH";
    const googleMapsUrl =
      "https://www.google.com/maps/place/Pak+Khlang+Beach+168/@11.5826078,102.9435186,17z/data=!4m6!3m5!1s0x3106650066e69f4f:0xf93485f77dc5f9fd!8m2!3d11.5826078!4d102.9435186";

    const parsed = updateThemeSchema.parse({
      nameEn: "Somros Chhne Pak Khlang 168",
      nameKm: "សម្រស់ឆ្នេរប៉ាក់ខ្លង 168",
      primaryColor: "#18181B",
      vendorMode: "LISTING_ONLY",
      currency: "KHR",
      showDualCurrency: true,
      exchangeRate: 4100,
      khrRounding: 100,
      meta: {
        phone,
        facebookUrl,
        googleMapsUrl,
      },
    });

    assert.equal(parsed.meta.phone, phone);
    assert.equal(parsed.meta.facebookUrl, facebookUrl);
    assert.equal(parsed.meta.googleMapsUrl, googleMapsUrl);
  });
});
