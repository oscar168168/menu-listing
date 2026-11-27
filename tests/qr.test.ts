import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMenuUrl,
  buildStyledQrDataUrl,
  buildStyledQrMatrixSvg,
  buildStyledQrSvg,
  generatePrintableTableCardSvg,
} from "../src/lib/qr";

describe("Telegram-style QR SVG generator", () => {
  it("builds menu URLs with optional table code cleanly", () => {
    assert.equal(
      buildMenuUrl("https://menu.app/", "pak-khlang-168"),
      "https://menu.app/m/pak-khlang-168"
    );
    assert.equal(
      buildMenuUrl("https://menu.app", "pak-khlang-168", "05"),
      "https://menu.app/m/pak-khlang-168?table=05"
    );
  });

  it("renders rounded finder eyes, connected liquid path, and circular center emblem", () => {
    const { matrixSize, innerSvg } = buildStyledQrMatrixSvg(
      "https://menu.app/m/pak-khlang-168"
    );
    assert.ok(matrixSize >= 25);
    assert.ok(innerSvg.includes('fill-rule="evenodd"'), "Expected smooth finder eye rings");
    assert.ok(innerSvg.includes("<circle "), "Expected circular center badge");
    assert.ok(innerSvg.includes('stroke-linecap="round"'), "Expected dining emblem inside center badge");
  });

  it("renders standalone white rounded card SVG with uppercase handle caption and valid Data URL", () => {
    const svg = buildStyledQrSvg("https://menu.app/m/pak-khlang-168?table=05", {
      includeFrame: true,
      handleLabel: "@pak-khlang-168 · 05",
    });
    assert.ok(svg.includes('rx="48"'), "Expected Telegram-style rounded outer sticker card");
    assert.ok(svg.includes("@PAK-KHLANG-168 · 05"));

    const dataUrl = buildStyledQrDataUrl("https://menu.app/m/pak-khlang-168");
    assert.ok(dataUrl.startsWith("data:image/svg+xml;charset=utf-8,"));
  });

  it("embeds the rounded QR matrix into printable table card SVGs", async () => {
    const card = await generatePrintableTableCardSvg({
      venueName: "សម្រស់ឆ្នេរប៉ាក់ខ្លង 168",
      tagline: "គ្រឿងសមុទ្រស្រស់ៗ",
      url: "https://menu.app/m/pak-khlang-168?table=08",
      primaryColor: "#18181B",
      tableCode: "08",
    });
    assert.ok(card.includes("TABLE 08"));
    assert.ok(card.includes('rx="34"'));
    assert.ok(card.includes('fill-rule="evenodd"'));
  });
});
