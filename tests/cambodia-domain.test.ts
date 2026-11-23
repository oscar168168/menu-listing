import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertKhrToUsd,
  convertUsdToKhr,
  formatDualPrice,
  formatMarketRange,
  roundKhr,
} from "../src/lib/currency";
import {
  formatWeightUnit,
  localizeTag,
  resolveLocalized,
} from "../src/lib/i18n";
import { parseTableCodeFromSearch, sanitizeTableCode } from "../src/lib/table-code";

describe("Cambodian localization & fallback helpers", () => {
  it("falls back cleanly when either Khmer or English is blank", () => {
    assert.equal(resolveLocalized("km", "ក្តាមឆាម្រេចកំពត", "Kampot Pepper Crab"), "ក្តាមឆាម្រេចកំពត");
    assert.equal(resolveLocalized("en", "ក្តាមឆាម្រេចកំពត", "Kampot Pepper Crab"), "Kampot Pepper Crab");
    assert.equal(resolveLocalized("km", "", "Only English"), "Only English");
    assert.equal(resolveLocalized("en", "តែខ្មែរ", ""), "តែខ្មែរ");
  });

  it("localizes seafood status tags and weight units cleanly", () => {
    assert.equal(localizeTag("Live Tank", "km"), "រស់");
    assert.equal(localizeTag("Fresh Catch", "km"), "ស្រស់");
    assert.equal(localizeTag("Spicy", "km"), "ហឹរ");
    assert.equal(localizeTag("Signature", "km"), "ប្រចាំហាង");
    assert.equal(formatWeightUnit("PER_500G", "en"), "/ 500g");
    assert.equal(formatWeightUnit("PER_KG", "km"), "/ គីឡូ");
  });

  it("parses and sanitizes table codes client-side from QR URL search params", () => {
    assert.equal(parseTableCodeFromSearch("?table=05"), "05");
    assert.equal(parseTableCodeFromSearch("?foo=1&table=PATIO-2"), "PATIO-2");
    assert.equal(parseTableCodeFromSearch("?table=%2007%20"), "07");
    assert.equal(parseTableCodeFromSearch("?table=bad/value!"), "");
    assert.equal(parseTableCodeFromSearch(""), "");
    assert.equal(sanitizeTableCode("A_12"), "A_12");
    assert.equal(sanitizeTableCode("x".repeat(25)), undefined);
  });
});

describe("Dual-currency engine (USD & KHR)", () => {
  it("rounds KHR cleanly to nearest 100 or 500", () => {
    assert.equal(roundKhr(51250, 100), 51300);
    assert.equal(roundKhr(51250, 500), 51500);
    assert.equal(convertUsdToKhr(12.5, 4100, 500), 51500);
    assert.equal(convertUsdToKhr(12.5, 4100, 100), 51300);
    assert.equal(convertKhrToUsd(65000, 4100), 15.85);
  });

  it("formats USD-primary and KHR-primary dual prices with weight units", () => {
    const usdDual = formatDualPrice(
      18.0,
      {
        primaryCurrency: "USD",
        showDualCurrency: true,
        exchangeRate: 4100,
        khrRounding: 500,
      },
      { weightUnit: "PER_500G", locale: "en" }
    );
    assert.equal(usdDual.primary, "$18.00 / 500g");
    assert.equal(usdDual.secondary, "74,000 ៛");

    const khrDual = formatDualPrice(
      65000,
      {
        primaryCurrency: "KHR",
        showDualCurrency: true,
        exchangeRate: 4100,
        khrRounding: 100,
      },
      { weightUnit: "PER_500G", locale: "km" }
    );
    assert.equal(khrDual.primary, "65,000 ៛ / ៥០០ក្រាម");
    assert.equal(khrDual.secondary, "$15.85");
  });

  it("omits secondary currency when showDualCurrency is false", () => {
    const single = formatDualPrice(12.5, {
      primaryCurrency: "USD",
      showDualCurrency: false,
      exchangeRate: 4100,
      khrRounding: 100,
    });
    assert.equal(single.primary, "$12.50");
    assert.equal(single.secondary, null);
  });

  it("formats optional Market Price estimated ranges", () => {
    const range = formatMarketRange(
      26,
      34,
      {
        primaryCurrency: "USD",
        showDualCurrency: true,
        exchangeRate: 4100,
        khrRounding: 500,
      },
      { weightUnit: "PER_KG", locale: "en" }
    );
    assert.ok(range);
    assert.equal(range.primary, "$26.00 – $34.00 / kg");
    assert.equal(range.secondary, "106,500 ៛ – 139,500 ៛");
  });
});
