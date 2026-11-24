import { z } from "zod";
import { normalizeHex } from "@/lib/theme";
import { slugify } from "@/lib/slug";

export { slugify };

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const hexColorSchema = z
  .string()
  .trim()
  .transform((val, ctx) => {
    const normalized = normalizeHex(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid hex color (e.g. #18181B)",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const vendorModeSchema = z.enum(["CART", "LISTING_ONLY"]);

export const pricingTypeSchema = z.enum([
  "FIXED",
  "WEIGHT_BASED",
  "MARKET_PRICE",
]);

export const weightUnitSchema = z.enum([
  "PER_100G",
  "PER_500G",
  "PER_KG",
  "PER_PIECE",
  "PER_PORTION",
]);

export const variantSchema = z.object({
  label: z.string().trim().min(1, "Variant label is required").max(50),
  labelKm: z.string().trim().max(60).optional().default(""),
  price: z.coerce.number().min(0, "Price must be >= 0").max(99999999),
});

export const cookingStyleOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  nameKm: z.string().trim().max(80).optional().default(""),
  nameEn: z.string().trim().max(80).optional().default(""),
  surcharge: z.coerce.number().min(0).max(99999999).default(0),
}).refine(
  (style) => style.nameKm.length > 0 || style.nameEn.length > 0,
  "Cooking style requires Khmer or English name"
);

export const loginSchema = z
  .object({
    identifier: z.string().trim().optional().default(""),
    username: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    email: z.string().trim().optional().default(""),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128),
  })
  .transform((d) => ({
    identifier: (d.identifier || d.username || d.phone || d.email).trim(),
    password: d.password,
  }))
  .refine(
    (d) => d.identifier.length >= 2,
    "Enter your username or phone number"
  );

export const createCategorySchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    nameKm: z.string().trim().max(80).optional().default(""),
    nameEn: z.string().trim().max(80).optional().default(""),
    isVisible: z.boolean().optional().default(true),
  })
  .refine(
    (d) => Boolean(d.nameKm || d.nameEn || d.name),
    "Provide a Khmer or English category name"
  );

export const updateCategorySchema = z.object({
  name: z.string().trim().max(80).optional(),
  nameKm: z.string().trim().max(80).optional(),
  nameEn: z.string().trim().max(80).optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const reorderCategoriesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const createMenuItemSchema = z
  .object({
    categoryId: z.string().min(1, "Category is required"),
    name: z.string().trim().max(120).optional(),
    nameKm: z.string().trim().max(120).optional().default(""),
    nameEn: z.string().trim().max(120).optional().default(""),
    description: z.string().trim().max(500).optional().default(""),
    descriptionKm: z.string().trim().max(500).optional().default(""),
    descriptionEn: z.string().trim().max(500).optional().default(""),
    pricingType: pricingTypeSchema.optional().default("FIXED"),
    weightUnit: weightUnitSchema.nullable().optional().default(null),
    price: z.coerce.number().min(0).max(99999999).optional().default(0),
    marketPriceMin: z.coerce
      .number()
      .min(0)
      .max(99999999)
      .nullable()
      .optional()
      .default(null),
    marketPriceMax: z.coerce
      .number()
      .min(0)
      .max(99999999)
      .nullable()
      .optional()
      .default(null),
    variants: z.array(variantSchema).max(12).optional().default([]),
    cookingStyles: z
      .array(cookingStyleOptionSchema)
      .max(12)
      .optional()
      .default([]),
    imageUrl: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    tags: z
      .array(z.string().trim().min(1).max(32))
      .max(10)
      .optional()
      .default([]),
    isAvailable: z.boolean().optional().default(true),
  })
  .refine(
    (d) => Boolean(d.nameKm || d.nameEn || d.name),
    "Provide a Khmer or English item name"
  );

export const updateMenuItemSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().max(120).optional(),
  nameKm: z.string().trim().max(120).optional(),
  nameEn: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  descriptionKm: z.string().trim().max(500).optional(),
  descriptionEn: z.string().trim().max(500).optional(),
  pricingType: pricingTypeSchema.optional(),
  weightUnit: weightUnitSchema.nullable().optional(),
  price: z.coerce.number().min(0).max(99999999).optional(),
  marketPriceMin: z.coerce.number().min(0).max(99999999).nullable().optional(),
  marketPriceMax: z.coerce.number().min(0).max(99999999).nullable().optional(),
  variants: z.array(variantSchema).max(12).optional(),
  cookingStyles: z.array(cookingStyleOptionSchema).max(12).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return v && v.length > 0 ? v : null;
    }),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateThemeSchema = z
  .object({
    name: z.string().trim().max(100).optional(),
    nameKm: z.string().trim().max(100).optional().default(""),
    nameEn: z.string().trim().max(100).optional().default(""),
    primaryColor: hexColorSchema,
    vendorMode: vendorModeSchema.optional().default("CART"),
    currency: z.enum(["USD", "KHR"]),
    showDualCurrency: z.boolean().default(true),
    exchangeRate: z.coerce.number().int().min(1000).max(10000).default(4100),
    khrRounding: z
      .coerce.number()
      .refine((v) => v === 100 || v === 500, "Rounding must be 100 or 500")
      .default(100),
    logoUrl: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        return v && v.length > 0 ? v : null;
      }),
    coverUrl: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        return v && v.length > 0 ? v : null;
      }),
    meta: z.object({
      tagline: z.string().trim().max(240).optional().default(""),
      taglineKm: z.string().trim().max(240).optional().default(""),
      taglineEn: z.string().trim().max(240).optional().default(""),
      openingHours: z.string().trim().max(200).optional().default(""),
      address: z.string().trim().max(400).optional().default(""),
      phone: z.string().trim().max(160).optional().default(""),
      telegramUrl: z.string().trim().max(500).optional().default(""),
      facebookUrl: z.string().trim().max(1000).optional().default(""),
      googleMapsUrl: z.string().trim().max(1000).optional().default(""),
      wifiName: z.string().trim().max(120).optional().default(""),
      wifiPassword: z.string().trim().max(120).optional().default(""),
      footerNote: z.string().trim().max(500).optional().default(""),
      footerNoteKm: z.string().trim().max(500).optional().default(""),
      serviceNote: z.string().trim().max(300).optional().default(""),
    }),
  })
  .refine(
    (d) => Boolean(d.nameEn || d.nameKm || d.name),
    "Venue name is required"
  );

export const provisionTenantSchema = z
  .object({
    name: z.string().trim().max(100).optional().default(""),
    nameKm: z.string().trim().max(100).optional().default(""),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Slug must be at least 2 characters")
      .max(48)
      .regex(SLUG_REGEX, "Use lowercase letters, numbers, and single hyphens only"),
    primaryColor: hexColorSchema.default("#1E293B"),
    vendorMode: vendorModeSchema.optional().default("CART"),
    currency: z.enum(["USD", "KHR"]).default("KHR"),
    showDualCurrency: z.boolean().optional().default(true),
    exchangeRate: z.coerce.number().int().min(1000).max(10000).optional().default(4100),
    tagline: z.string().trim().max(160).optional().default(""),
    taglineKm: z.string().trim().max(160).optional().default(""),
    ownerName: z.string().trim().min(2, "Owner name is required").max(80),
    ownerEmail: z.string().trim().max(120).optional().default(""),
    ownerUsername: z.string().trim().max(120).optional().default(""),
    ownerPhone: z.string().trim().max(120).optional().default(""),
    ownerPassword: z.string().min(6, "Password must be at least 6 characters").max(128),
  })
  .refine(
    (d) => (d.nameKm || d.name).trim().length >= 2,
    "Venue name (Khmer or English) must be at least 2 characters"
  )
  .refine(
    (d) =>
      (d.ownerUsername || d.ownerPhone || d.ownerEmail).trim().length >= 3,
    "Owner username or phone number is required"
  );

export const updateTenantStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    vendorMode: vendorModeSchema.optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Slug must be at least 2 characters")
      .max(48)
      .regex(
        SLUG_REGEX,
        "Use lowercase letters, numbers, and single hyphens only"
      )
      .optional(),
    name: z.string().trim().min(2).max(100).optional(),
    nameKm: z.string().trim().max(100).optional(),
    nameEn: z.string().trim().max(100).optional(),
    currency: z.enum(["USD", "KHR"]).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.vendorMode !== undefined ||
      d.slug !== undefined ||
      d.name !== undefined ||
      d.nameKm !== undefined ||
      d.nameEn !== undefined ||
      d.currency !== undefined,
    "Provide at least one field to update"
  );

export const scanEventSchema = z.object({
  slug: z.string().trim().min(1).max(64),
  tableCode: z
    .string()
    .trim()
    .max(24)
    .regex(/^[a-zA-Z0-9_-]*$/)
    .optional()
    .nullable(),
});
