import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "../src/lib/auth";

describe("Authentication crypto helpers", () => {
  it("hashes and verifies passwords with unique random salts", () => {
    const hashA = hashPassword("SecretPass123!");
    const hashB = hashPassword("SecretPass123!");
    assert.notEqual(hashA, hashB);
    assert.equal(verifyPassword("SecretPass123!", hashA), true);
    assert.equal(verifyPassword("WrongPass", hashA), false);
    assert.equal(verifyPassword("SecretPass123!", "malformed"), false);
  });

  it("signs, verifies, and rejects tampered session tokens", () => {
    const token = signSessionToken({
      sub: "user_123",
      role: "MENU_ADMIN",
      tenantId: "tenant_abc",
    });

    const decoded = verifySessionToken(token);
    assert.ok(decoded);
    assert.equal(decoded.sub, "user_123");
    assert.equal(decoded.role, "MENU_ADMIN");
    assert.equal(decoded.tenantId, "tenant_abc");

    const tampered = `${token.slice(0, -2)}xx`;
    assert.equal(verifySessionToken(tampered), null);
  });
});
