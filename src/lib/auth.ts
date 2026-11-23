import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { tenantDoc, tenantsCol, usersCol } from "@/lib/firestore";
import type { SessionUser, UserRole } from "@/types/menu";

export const SESSION_COOKIE_NAME = "menuos_session";
export const IMPERSONATE_COOKIE_NAME = "menuos_impersonate_tenant";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "menuos-dev-fallback-secret-do-not-use-in-production"
  );
}

function scryptAsync(
  password: string,
  salt: string,
  keylen: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export async function hashPasswordAsync(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const derived = crypto.scryptSync(password, salt, 64);
  const storedKey = Buffer.from(keyHex, "hex");
  if (derived.length !== storedKey.length) return false;

  return crypto.timingSafeEqual(derived, storedKey);
}

export async function verifyPasswordAsync(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const derived = await scryptAsync(password, salt, 64);
  const storedKey = Buffer.from(keyHex, "hex");
  if (derived.length !== storedKey.length) return false;

  return crypto.timingSafeEqual(derived, storedKey);
}

interface TokenPayload {
  sub: string;
  email?: string;
  name?: string;
  role: UserRole;
  tenantId: string | null;
  exp: number;
}

export function signSessionToken(payload: Omit<TokenPayload, "exp">): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as TokenPayload;
    if (
      typeof parsed.sub !== "string" ||
      (parsed.role !== "SUPER_ADMIN" && parsed.role !== "MENU_ADMIN") ||
      typeof parsed.exp !== "number" ||
      (parsed.email !== undefined && typeof parsed.email !== "string") ||
      (parsed.name !== undefined && typeof parsed.name !== "string")
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = signSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(IMPERSONATE_COOKIE_NAME);
}

export const getSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;

    const payload = verifySessionToken(raw);
    if (!payload) return null;

    if (payload.email && payload.name) {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: payload.tenantId ?? null,
      };
    }

    const userSnap = await usersCol().doc(payload.sub).get();
    if (!userSnap.exists) return null;
    const user = userSnap.data();
    if (!user) return null;

    return {
      id: userSnap.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? null,
    };
  }
);

export interface AdminContext {
  user: SessionUser;
  tenantId: string;
  isImpersonating: boolean;
}

/**
 * Resolves the strict tenantId scope for Menu Admin endpoints & pages.
 * - MENU_ADMIN is unconditionally locked to user.tenantId.
 * - SUPER_ADMIN may specify an impersonated tenant via cookie (or default to first tenant when inspecting /admin).
 */
export const resolveAdminContext = cache(
  async (): Promise<AdminContext | null> => {
    const user = await getSessionUser();
    if (!user) return null;

    if (user.role === "MENU_ADMIN") {
      if (!user.tenantId) return null;
      return {
        user,
        tenantId: user.tenantId,
        isImpersonating: false,
      };
    }

    // SUPER_ADMIN troubleshooting/impersonation mode
    const cookieStore = await cookies();
    const impersonatedId = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;

    if (impersonatedId) {
      const snap = await tenantDoc(impersonatedId).get();
      if (snap.exists) {
        return {
          user,
          tenantId: snap.id,
          isImpersonating: true,
        };
      }
    }

    // Fallback for SUPER_ADMIN visiting /admin directly: pick first venue
    const firstSnap = await tenantsCol()
      .orderBy("createdAt", "asc")
      .limit(1)
      .select()
      .get();
    const firstTenant = firstSnap.docs[0];
    if (!firstTenant) return null;

    return {
      user,
      tenantId: firstTenant.id,
      isImpersonating: true,
    };
  }
);

export const requireSuperAdmin = cache(
  async (): Promise<SessionUser | null> => {
    const user = await getSessionUser();
    if (!user || user.role !== "SUPER_ADMIN") return null;
    return user;
  }
);
