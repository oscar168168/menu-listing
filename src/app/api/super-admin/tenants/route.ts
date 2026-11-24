import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  cookingStylesCol,
  findTenantBySlug,
  findUserByIdentifier,
  getDb,
  normalizePhone,
  tenantsCol,
  usersCol,
} from "@/lib/firestore";
import { hashPasswordAsync, requireSuperAdmin } from "@/lib/auth";
import { provisionTenantSchema } from "@/lib/validation";
import {
  getSuperAdminDashboardData,
  revalidatePublicMenu,
} from "@/lib/menu-data";
import {
  DEFAULT_COOKING_STYLE_PRESETS,
  DEFAULT_MENU_CATEGORIES,
} from "@/lib/i18n";
import type {
  ScanAnalyticsRow,
  SuperAdminTenantSummary,
} from "@/types/menu";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getSuperAdminDashboardData();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = provisionTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid tenant details" },
      { status: 400 }
    );
  }

  const rawIdentifier = (
    parsed.data.ownerUsername ||
    parsed.data.ownerPhone ||
    parsed.data.ownerEmail
  ).trim();
  const normalizedPhone = normalizePhone(parsed.data.ownerPhone || rawIdentifier);
  const isPhoneIdentifier =
    normalizedPhone.length >= 6 &&
    /^[+\d\s\-()]+$/.test(parsed.data.ownerPhone || rawIdentifier);
  const ownerUsername = (
    parsed.data.ownerUsername ||
    (!isPhoneIdentifier ? rawIdentifier : "")
  )
    .trim()
    .toLowerCase();
  const ownerPhone =
    parsed.data.ownerPhone.trim() || (isPhoneIdentifier ? normalizedPhone : "");
  const ownerAccountKey = (
    ownerUsername ||
    ownerPhone ||
    parsed.data.ownerEmail.trim().toLowerCase()
  ).trim();

  const [existingSlug, existingUser, passwordHash] = await Promise.all([
    findTenantBySlug(parsed.data.slug),
    findUserByIdentifier(ownerAccountKey),
    hashPasswordAsync(parsed.data.ownerPassword),
  ]);

  if (existingSlug) {
    return NextResponse.json(
      { error: `Slug "/m/${parsed.data.slug}" is already taken.` },
      { status: 409 }
    );
  }

  if (existingUser) {
    return NextResponse.json(
      { error: `An account with "${ownerAccountKey}" already exists.` },
      { status: 409 }
    );
  }

  const db = getDb();
  const batch = db.batch();
  const now = new Date();

  const cleanNameKm = parsed.data.nameKm.trim();
  const cleanNameEn = parsed.data.name.trim();
  const canonicalName = cleanNameKm || cleanNameEn;
  const cleanTaglineKm = parsed.data.taglineKm.trim();
  const cleanTaglineEn = parsed.data.tagline.trim();
  const canonicalTagline = cleanTaglineKm || cleanTaglineEn;

  const newTenantRef = tenantsCol().doc();
  batch.set(newTenantRef, {
    name: canonicalName,
    nameKm: cleanNameKm || canonicalName,
    nameEn: cleanNameEn || canonicalName,
    slug: parsed.data.slug,
    status: "ACTIVE",
    vendorMode: parsed.data.vendorMode,
    logoUrl: null,
    coverUrl: null,
    currency: parsed.data.currency,
    showDualCurrency: parsed.data.showDualCurrency,
    exchangeRate: parsed.data.exchangeRate,
    khrRounding: 100,
    primaryColor: parsed.data.primaryColor,
    metaJson:
      canonicalTagline || ownerPhone
        ? {
            ...(canonicalTagline
              ? {
                  tagline: canonicalTagline,
                  taglineKm: cleanTaglineKm || canonicalTagline,
                  taglineEn: cleanTaglineEn || canonicalTagline,
                }
              : {}),
            ...(ownerPhone ? { phone: ownerPhone } : {}),
          }
        : {},
    createdAt: now,
    updatedAt: now,
  });

  const newOwnerRef = usersCol().doc();
  batch.set(newOwnerRef, {
    name: parsed.data.ownerName,
    email: parsed.data.ownerEmail.trim().toLowerCase() || ownerAccountKey,
    ...(ownerUsername ? { username: ownerUsername } : {}),
    ...(ownerPhone ? { phone: normalizePhone(ownerPhone) || ownerPhone } : {}),
    passwordHash,
    role: "MENU_ADMIN",
    tenantId: newTenantRef.id,
    createdAt: now,
    updatedAt: now,
  });

  DEFAULT_MENU_CATEGORIES.forEach((cat, idx) => {
    const catRef = categoriesCol(newTenantRef.id).doc();
    batch.set(catRef, {
      tenantId: newTenantRef.id,
      name: cat.nameKm,
      nameEn: cat.nameEn,
      nameKm: cat.nameKm,
      sortOrder: idx,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  DEFAULT_COOKING_STYLE_PRESETS.forEach((preset, idx) => {
    const styleRef = cookingStylesCol(newTenantRef.id).doc();
    batch.set(styleRef, {
      tenantId: newTenantRef.id,
      nameKm: preset.nameKm,
      nameEn: preset.nameEn,
      defaultSurcharge:
        parsed.data.currency === "KHR"
          ? preset.defaultSurcharge * 4000
          : preset.defaultSurcharge,
      sortOrder: idx,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  revalidatePublicMenu(parsed.data.slug);

  const summary: SuperAdminTenantSummary = {
    id: newTenantRef.id,
    name: canonicalName,
    nameKm: cleanNameKm || canonicalName,
    nameEn: cleanNameEn || canonicalName,
    slug: parsed.data.slug,
    status: "ACTIVE",
    vendorMode: parsed.data.vendorMode,
    primaryColor: parsed.data.primaryColor,
    currency: parsed.data.currency,
    ownerEmail: ownerAccountKey,
    ownerUsername: ownerUsername || null,
    ownerPhone: ownerPhone || null,
    ownerName: parsed.data.ownerName,
    itemCount: 0,
    categoryCount: DEFAULT_MENU_CATEGORIES.length,
    scanCount: 0,
    scansLast7Days: 0,
    createdAt: now.toISOString(),
  };

  const analyticsRow: ScanAnalyticsRow = {
    tenantId: newTenantRef.id,
    tenantName: canonicalName,
    tenantNameKm: cleanNameKm || canonicalName,
    tenantNameEn: cleanNameEn || canonicalName,
    slug: parsed.data.slug,
    primaryColor: parsed.data.primaryColor,
    totalScans: 0,
    last7Days: 0,
    topTables: [],
  };

  return NextResponse.json(
    {
      tenantId: newTenantRef.id,
      slug: parsed.data.slug,
      summary,
      analyticsRow,
    },
    { status: 201 }
  );
}
