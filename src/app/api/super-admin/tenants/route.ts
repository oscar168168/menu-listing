import { NextRequest, NextResponse } from "next/server";
import { Role, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
    prisma.tenant.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: parsed.data.ownerEmail },
      select: { id: true },
    }),
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

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: parsed.data.name,
        nameEn: parsed.data.name,
        nameKm: parsed.data.nameKm || null,
        slug: parsed.data.slug,
        status: TenantStatus.ACTIVE,
        vendorMode: parsed.data.vendorMode,
        currency: parsed.data.currency,
        showDualCurrency: parsed.data.showDualCurrency,
        exchangeRate: parsed.data.exchangeRate,
        khrRounding: 100,
        primaryColor: parsed.data.primaryColor,
        metaJson: parsed.data.tagline
          ? { tagline: parsed.data.tagline, taglineEn: parsed.data.tagline }
          : {},
      },
    });

    const owner = await tx.user.create({
      data: {
        name: parsed.data.ownerName,
        email: parsed.data.ownerEmail,
        passwordHash: hashPassword(parsed.data.ownerPassword),
        role: Role.MENU_ADMIN,
        tenantId: tenant.id,
      },
    });

    await tx.category.create({
      data: {
        tenantId: tenant.id,
        name: "Fresh Seafood",
        nameEn: "Fresh Seafood",
        nameKm: "គ្រឿងសមុទ្រស្រស់",
        sortOrder: 0,
        isVisible: true,
      },
    });

    await tx.cookingStyle.createMany({
      data: DEFAULT_COOKING_STYLE_PRESETS.map((preset, idx) => ({
        tenantId: tenant.id,
        nameKm: preset.nameKm,
        nameEn: preset.nameEn,
        defaultSurcharge:
          parsed.data.currency === "KHR"
            ? preset.defaultSurcharge * 4000
            : preset.defaultSurcharge,
        sortOrder: idx,
      })),
    });

    return { tenant, owner };
  });

  const dashboard = await getSuperAdminDashboardData();

  return NextResponse.json(
    {
      tenantId: created.tenant.id,
      slug: created.tenant.slug,
      dashboard,
    },
    { status: 201 }
  );
}
