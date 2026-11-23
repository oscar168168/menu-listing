import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
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

interface TokenPayload {
  sub: string;
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
      typeof parsed.exp !== "number"
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

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = verifySessionToken(raw);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  };
}

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
export async function resolveAdminContext(): Promise<AdminContext | null> {
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
    const exists = await prisma.tenant.findUnique({
      where: { id: impersonatedId },
      select: { id: true },
    });
    if (exists) {
      return {
        user,
        tenantId: exists.id,
        isImpersonating: true,
      };
    }
  }

  // Fallback for SUPER_ADMIN visiting /admin directly: pick first venue
  const firstTenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!firstTenant) return null;

  return {
    user,
    tenantId: firstTenant.id,
    isImpersonating: true,
  };
}

export async function requireSuperAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}
