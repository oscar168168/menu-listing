export type UserRole = "SUPER_ADMIN" | "MENU_ADMIN";
export type TenantStatusType = "ACTIVE" | "SUSPENDED";
export type VendorMode = "CART" | "LISTING_ONLY";
export type Locale = "km" | "en";
export type PrimaryCurrency = "USD" | "KHR";
export type KhrRounding = 100 | 500;
export type PricingType = "FIXED" | "WEIGHT_BASED" | "MARKET_PRICE";
export type WeightUnit =
  | "PER_100G"
  | "PER_500G"
  | "PER_KG"
  | "PER_PIECE"
  | "PER_PORTION";

export interface TenantMeta {
  tagline?: string;
  taglineKm?: string;
  taglineEn?: string;
  openingHours?: string;
  address?: string;
  phone?: string;
  telegramUrl?: string;
  facebookUrl?: string;
  googleMapsUrl?: string;
  wifiName?: string;
  wifiPassword?: string;
  footerNote?: string;
  footerNoteKm?: string;
  serviceNote?: string;
  currencySymbol?: string;
}

export interface ItemVariant {
  label: string;
  labelKm?: string;
  price: number;
}

export interface CookingStyleOption {
  id: string;
  nameKm: string;
  nameEn: string;
  surcharge: number;
}

export interface SerializedCookingStylePreset {
  id: string;
  tenantId: string;
  nameKm: string;
  nameEn: string;
  defaultSurcharge: number;
  sortOrder: number;
}

export interface SerializedMenuItem {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  nameKm: string;
  nameEn: string;
  description: string;
  descriptionKm: string;
  descriptionEn: string;
  pricingType: PricingType;
  weightUnit: WeightUnit | null;
  price: number;
  marketPriceMin: number | null;
  marketPriceMax: number | null;
  variants: ItemVariant[];
  cookingStyles: CookingStyleOption[];
  imageUrl: string | null;
  tags: string[];
  isAvailable: boolean;
  sortOrder: number;
}

export interface SerializedCategory {
  id: string;
  tenantId: string;
  name: string;
  nameKm: string;
  nameEn: string;
  sortOrder: number;
  isVisible: boolean;
  items: SerializedMenuItem[];
}

export interface SerializedTenant {
  id: string;
  name: string;
  nameKm: string;
  nameEn: string;
  slug: string;
  status: TenantStatusType;
  vendorMode: VendorMode;
  logoUrl: string | null;
  coverUrl: string | null;
  currency: PrimaryCurrency;
  showDualCurrency: boolean;
  exchangeRate: number;
  khrRounding: KhrRounding;
  primaryColor: string;
  meta: TenantMeta;
  createdAt: string;
}

export interface TenantMenuPayload {
  tenant: SerializedTenant;
  categories: SerializedCategory[];
  cookingStylePresets: SerializedCookingStylePreset[];
}

export interface ShortlistEntry {
  key: string; // itemId + variant + cookingStyle composite key
  itemId: string;
  nameKm: string;
  nameEn: string;
  pricingType: PricingType;
  weightUnit: WeightUnit | null;
  unitPrice: number;
  marketPriceMin: number | null;
  marketPriceMax: number | null;
  variantLabel?: string;
  variantLabelKm?: string;
  cookingStyle?: CookingStyleOption;
  quantity: number;
}

export interface SuperAdminTenantSummary {
  id: string;
  name: string;
  nameKm: string;
  nameEn: string;
  slug: string;
  status: TenantStatusType;
  vendorMode: VendorMode;
  primaryColor: string;
  currency: string;
  ownerEmail: string | null;
  ownerName: string | null;
  itemCount: number;
  categoryCount: number;
  scanCount: number;
  scansLast7Days: number;
  createdAt: string;
}

export interface ScanAnalyticsRow {
  tenantId: string;
  tenantName: string;
  slug: string;
  primaryColor: string;
  totalScans: number;
  last7Days: number;
  topTables: Array<{ tableCode: string; count: number }>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
}
