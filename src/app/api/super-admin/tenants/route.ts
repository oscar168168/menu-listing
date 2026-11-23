import { NextRequest, NextResponse } from "next/server";
import {
  categoriesCol,
  cookingStylesCol,
  findTenantBySlug,
  findUserByEmail,
  getDb,
  tenantsCol,
  usersCol,
} from "@/lib/firestore";
import { hashPassword, requireSuperAdmin } from "@/lib/auth";
import { provisionTenantSchema } from "@/lib/validation";
import { getSuperAdminDashboardData } from "@/lib/menu-data";
import { DEFAULT_COOKING_STYLE_PRESETS } from "@/lib/i18n";

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

  const [existingSlug, existingEmail] = await Promise.all([
    findTenantBySlug(parsed.data.slug),
    findUserByEmail(parsed.data.ownerEmail),
  ]);

  if (existingSlug) {
    return NextResponse.json(
      { error: `Slug "/m/${parsed.data.slug}" is already taken.` },
      { status: 409 }
    );
  }

  if (existingEmail) {
    return NextResponse.json(
      { error: `An account with ${parsed.data.ownerEmail} already exists.` },
      { status: 409 }
    );
  }

  const db = getDb();
  const batch = db.batch();
  const now = new Date();

  const newTenantRef = tenantsCol().doc();
  batch.set(newTenantRef, {
    name: parsed.data.name,
    nameEn: parsed.data.name,
    nameKm: parsed.data.nameKm || null,
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
    metaJson: parsed.data.tagline
      ? { tagline: parsed.data.tagline, taglineEn: parsed.data.tagline }
      : {},
    createdAt: now,
    updatedAt: now,
  });

  const newOwnerRef = usersCol().doc();
  batch.set(newOwnerRef, {
    name: parsed.data.ownerName,
    email: parsed.data.ownerEmail,
    passwordHash: hashPassword(parsed.data.ownerPassword),
    role: "MENU_ADMIN",
    tenantId: newTenantRef.id,
    createdAt: now,
    updatedAt: now,
  });

  const defaultCatRef = categoriesCol(newTenantRef.id).doc();
  batch.set(defaultCatRef, {
    tenantId: newTenantRef.id,
    name: "Fresh Seafood",
    nameEn: "Fresh Seafood",
    nameKm: "គ្រឿងសមុទ្រស្រស់",
    sortOrder: 0,
    isVisible: true,
    createdAt: now,
    updatedAt: now,
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

  const dashboard = await getSuperAdminDashboardData();

  return NextResponse.json(
    {
      tenantId: newTenantRef.id,
      slug: parsed.data.slug,
      dashboard,
    },
    { status: 201 }
  );
}
