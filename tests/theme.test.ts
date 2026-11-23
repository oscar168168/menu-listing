import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeThemeContrast,
  DARK_FOREGROUND,
  DEFAULT_PRIMARY_COLOR,
  formatPrice,
  getContrastRatio,
  getRelativeLuminance,
  getTenantThemeStyle,
  LIGHT_FOREGROUND,
  normalizeHex,
  sanitizeHex,
} from "../src/lib/theme";

describe("WCAG 2.1 contrast & theme token utility", () => {
  it("normalizes 3-digit and 6-digit hex strings", () => {
    assert.equal(normalizeHex("#abc"), "#AABBCC");
    assert.equal(normalizeHex("18181b"), "#18181B");
    assert.equal(normalizeHex(" #14532d "), "#14532D");
    assert.equal(normalizeHex("not-a-hex"), null);
    assert.equal(sanitizeHex("invalid"), DEFAULT_PRIMARY_COLOR);
  });

  it("computes accurate relative luminance for black and white", () => {
    assert.equal(getRelativeLuminance("#000000"), 0);
    assert.equal(getRelativeLuminance("#FFFFFF"), 1);
    assert.equal(Number(getContrastRatio("#000000", "#FFFFFF").toFixed(2)), 21);
  });

  it("assigns #FFFFFF foreground for dark primaries (e.g. obsidian & botanical green)", () => {
    const obsidian = computeThemeContrast("#18181B");
    assert.equal(obsidian.foreground, LIGHT_FOREGROUND);
    assert.equal(obsidian.passesAAA, true);
    assert.equal(obsidian.rating, "AAA");

    const botanical = computeThemeContrast("#14532D");
    assert.equal(botanical.foreground, LIGHT_FOREGROUND);
    assert.equal(botanical.passesAA, true);
    assert.ok(botanical.selectedContrast >= 9);
  });

  it("assigns #09090B dark foreground for yellow and pastel primaries", () => {
    const saffron = computeThemeContrast("#EAB308");
    assert.equal(saffron.foreground, DARK_FOREGROUND);
    assert.equal(saffron.passesAAA, true);
    assert.ok(saffron.selectedContrast >= 10);

    const pastelMint = computeThemeContrast("#BBF7D0");
    assert.equal(pastelMint.foreground, DARK_FOREGROUND);
    assert.equal(pastelMint.passesAAA, true);
  });

  it("generates zero-FOUC CSS custom property map", () => {
    const style = getTenantThemeStyle("#eab308") as Record<string, string>;
    assert.equal(style["--brand-primary"], "#EAB308");
    assert.equal(style["--brand-primary-foreground"], "#09090B");
    assert.equal(
      style["--brand-primary-subtle"],
      "color-mix(in srgb, #EAB308 10%, transparent)"
    );
  });

  it("formats prices consistently across currencies", () => {
    assert.equal(formatPrice(5.25, "USD"), "$5.25");
    assert.equal(formatPrice(19, "EUR"), "€19.00");
    assert.equal(formatPrice(1250, "JPY"), "¥1,250");
    assert.equal(formatPrice(12.5, "USD", "CHF "), "CHF 12.50");
  });
});
