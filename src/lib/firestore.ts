import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";
import type {
  CategoryPricingMode,
  CookingStyleOption,
  ItemVariant,
  PricingType,
  TenantMeta,
  TenantStatusType,
  UserRole,
  VendorMode,
  WeightUnit,
} from "@/types/menu";

export interface FirestoreUserDoc {
  email: string;
  username?: string;
  phone?: string;
  loginKeys?: string[];
  name: string;
  passwordHash: string;
  role: UserRole;
  tenantId: string | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface FirestoreTenantDoc {
  name: string;
  nameKm: string | null;
  nameEn: string | null;
  slug: string;
  status: TenantStatusType;
  vendorMode: VendorMode;
  logoUrl: string | null;
  coverUrl: string | null;
  currency: string;
  showDualCurrency: boolean;
  exchangeRate: number;
  khrRounding: number;
  primaryColor: string;
  metaJson: TenantMeta | Record<string, unknown>;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface FirestoreCookingStyleDoc {
  tenantId: string;
  nameKm: string | null;
  nameEn: string | null;
  defaultSurcharge: number;
  sortOrder: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface FirestoreCategoryDoc {
  tenantId: string;
  name: string;
  nameKm: string | null;
  nameEn: string | null;
  sortOrder: number;
  isVisible: boolean;
  pricingMode?: CategoryPricingMode;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface FirestoreMenuItemDoc {
  tenantId: string;
  categoryId: string;
  name: string;
  nameKm: string | null;
  nameEn: string | null;
  description: string;
  descriptionKm: string | null;
  descriptionEn: string | null;
  pricingType: PricingType;
  weightUnit: WeightUnit | null;
  priceDecimal: number;
  marketPriceMin: number | null;
  marketPriceMax: number | null;
  variantsJson: ItemVariant[] | null;
  cookingStylesJson: CookingStyleOption[] | null;
  imageUrl: string | null;
  tags: string[];
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface FirestoreScanEventDoc {
  tenantId: string;
  tableCode: string | null;
  userAgent: string | null;
  scannedAt: Timestamp | Date;
  expiresAt?: Timestamp | Date;
}

export interface FirestoreScanStatDoc {
  tenantId: string;
  date: string;
  totalScans: number;
  tableCounts?: Record<string, number>;
  updatedAt: Timestamp | Date;
}

export interface FirestoreTenantSlugDoc {
  tenantId: string;
  slug: string;
  updatedAt: Timestamp | Date;
}

export interface FirestoreMediaDoc {
  tenantId: string;
  mimeType: string;
  size: number;
  data: Buffer | Uint8Array;
  createdAt: Timestamp | Date;
}

const globalForFirestore = globalThis as unknown as {
  firebaseAdminApp?: App;
  firestoreClient?: Firestore;
  firestoreSettingsApplied?: boolean;
};

function resolveProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  if (process.env.GOOGLE_CLOUD_PROJECT?.trim()) {
    return process.env.GOOGLE_CLOUD_PROJECT.trim();
  }
  if (process.env.GCLOUD_PROJECT?.trim()) {
    return process.env.GCLOUD_PROJECT.trim();
  }
  if (process.env.FIREBASE_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_CONFIG) as {
        projectId?: string;
      };
      if (parsed.projectId) return parsed.projectId;
    } catch {
      // ignore malformed FIREBASE_CONFIG
    }
  }
  return "menu-listing";
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const jsonText = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(jsonText) as ServiceAccount & {
      private_key?: string;
    };
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    if (typeof parsed.privateKey === "string") {
      parsed.privateKey = parsed.privateKey.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", error);
    return null;
  }
}

export function getFirebaseAdminApp(): App {
  if (globalForFirestore.firebaseAdminApp) {
    return globalForFirestore.firebaseAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    globalForFirestore.firebaseAdminApp = existingApps[0];
    return existingApps[0];
  }

  const projectId = resolveProjectId();
  const serviceAccount = parseServiceAccountFromEnv();

  const app = serviceAccount
    ? initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || projectId,
      })
    : initializeApp({ projectId });

  globalForFirestore.firebaseAdminApp = app;
  return app;
}

export function getDb(): Firestore {
  if (globalForFirestore.firestoreClient) {
    return globalForFirestore.firestoreClient;
  }

  if (!("FIRESTORE_ENABLE_TRACING" in process.env)) {
    process.env.FIRESTORE_ENABLE_TRACING = "off";
  }

  const db = getFirestore(getFirebaseAdminApp());
  if (!globalForFirestore.firestoreSettingsApplied) {
    try {
      db.settings({
        ignoreUndefinedProperties: true,
        preferRest: !process.env.FIRESTORE_EMULATOR_HOST,
      });
    } catch {
      // settings already applied during hot reload
    }
    globalForFirestore.firestoreSettingsApplied = true;
  }

  globalForFirestore.firestoreClient = db;
  return db;
}

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

export function usersCol(): CollectionReference<FirestoreUserDoc> {
  return getDb().collection("users") as CollectionReference<FirestoreUserDoc>;
}

export function tenantsCol(): CollectionReference<FirestoreTenantDoc> {
  return getDb().collection("tenants") as CollectionReference<FirestoreTenantDoc>;
}

export function tenantSlugsCol(): CollectionReference<FirestoreTenantSlugDoc> {
  return getDb().collection(
    "tenantSlugs"
  ) as CollectionReference<FirestoreTenantSlugDoc>;
}

export function tenantDoc(tenantId: string) {
  return tenantsCol().doc(tenantId);
}

export function categoriesCol(
  tenantId: string
): CollectionReference<FirestoreCategoryDoc> {
  return tenantDoc(tenantId).collection(
    "categories"
  ) as CollectionReference<FirestoreCategoryDoc>;
}

export function menuItemsCol(
  tenantId: string
): CollectionReference<FirestoreMenuItemDoc> {
  return tenantDoc(tenantId).collection(
    "menuItems"
  ) as CollectionReference<FirestoreMenuItemDoc>;
}

export function cookingStylesCol(
  tenantId: string
): CollectionReference<FirestoreCookingStyleDoc> {
  return tenantDoc(tenantId).collection(
    "cookingStyles"
  ) as CollectionReference<FirestoreCookingStyleDoc>;
}

export function scanEventsCol(
  tenantId: string
): CollectionReference<FirestoreScanEventDoc> {
  return tenantDoc(tenantId).collection(
    "scanEvents"
  ) as CollectionReference<FirestoreScanEventDoc>;
}

export function scanStatsCol(
  tenantId: string
): CollectionReference<FirestoreScanStatDoc> {
  return tenantDoc(tenantId).collection(
    "scanStats"
  ) as CollectionReference<FirestoreScanStatDoc>;
}

export function mediaCol(
  tenantId: string
): CollectionReference<FirestoreMediaDoc> {
  return tenantDoc(tenantId).collection(
    "media"
  ) as CollectionReference<FirestoreMediaDoc>;
}

const SAFE_MEDIA_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

export function extractFirestoreMediaId(
  url: string | null | undefined,
  tenantId: string
): string | null {
  if (!url) return null;
  const pathOnly = url.split("?")[0]?.split("#")[0]?.trim() ?? "";
  const prefix = `/api/media/${tenantId}/`;
  if (!pathOnly.startsWith(prefix)) return null;
  const mediaId = pathOnly.slice(prefix.length);
  return SAFE_MEDIA_ID_RE.test(mediaId) ? mediaId : null;
}

/**
 * Deletes an orphaned built-in Firestore media document if it belongs to the tenant
 * and is no longer referenced by any item or tenant branding field.
 */
export async function deleteOrphanedMediaUrl(
  tenantId: string,
  url: string | null | undefined
): Promise<void> {
  const mediaId = extractFirestoreMediaId(url, tenantId);
  if (!mediaId || !url) return;

  const [matchingItems, tenantSnap] = await Promise.all([
    menuItemsCol(tenantId).where("imageUrl", "==", url).limit(1).select().get(),
    tenantDoc(tenantId).get(),
  ]);
  if (!matchingItems.empty) return;

  const tenant = tenantSnap.data();
  if (tenant && (tenant.logoUrl === url || tenant.coverUrl === url)) {
    return;
  }

  await mediaCol(tenantId).doc(mediaId).delete();
}

export function formatCambodiaDateKey(date: Date = new Date()): string {
  const cambodiaMs = date.getTime() + 7 * 60 * 60 * 1000;
  return new Date(cambodiaMs).toISOString().slice(0, 10);
}

export async function findTenantBySlug(slug: string): Promise<{
  id: string;
  data: FirestoreTenantDoc;
} | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  const slugSnap = await tenantSlugsCol().doc(cleanSlug).get();
  const slugLock = slugSnap.data();
  if (slugSnap.exists && slugLock?.tenantId) {
    const tSnap = await tenantDoc(slugLock.tenantId).get();
    const tData = tSnap.data();
    if (tSnap.exists && tData && tData.slug.toLowerCase() === cleanSlug) {
      return { id: tSnap.id, data: tData };
    }
  }

  const snap = await tenantsCol()
    .where("slug", "==", cleanSlug)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, data: doc.data() };
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("855") && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  data: FirestoreUserDoc;
} | null> {
  return findUserByIdentifier(email);
}

const LEGACY_IDENTIFIER_ALIASES: Record<string, string> = {
  admin: "admin@menuos.app",
  "012888999": "admin@menuos.app",
  sora: "owner@soraseafood.com",
  "093765166": "owner@soraseafood.com",
  kepbay: "chef@kepbaykitchen.com",
  "012784220": "chef@kepbaykitchen.com",
};

function addPhoneKeys(target: Set<string>, raw: string | null | undefined): void {
  if (!raw) return;
  const normalized = normalizePhone(raw);
  if (normalized.length < 6) return;
  target.add(normalized);
  if (normalized.startsWith("0") && normalized.length >= 9) {
    target.add(`855${normalized.slice(1)}`);
  }
}

export function buildUserLoginKeys(input: {
  email?: string | null;
  username?: string | null;
  phone?: string | null;
}): string[] {
  const keys = new Set<string>();
  const email = input.email?.trim().toLowerCase() ?? "";
  const username = input.username?.trim().toLowerCase() ?? "";

  if (username) keys.add(username);
  if (email) {
    keys.add(email);
    if (email.includes("@")) {
      const localPart = email.split("@")[0]?.trim() ?? "";
      if (localPart.length >= 2) keys.add(localPart);
    }
  }

  addPhoneKeys(keys, input.phone);
  addPhoneKeys(keys, input.username);
  addPhoneKeys(keys, input.email);

  return Array.from(keys).slice(0, 16);
}

export function expandIdentifierLookupCandidates(identifier: string): string[] {
  const trimmed = identifier.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const phoneNorm = normalizePhone(trimmed);
  const candidates = new Set<string>([lower]);

  if (phoneNorm.length >= 6) {
    candidates.add(phoneNorm);
    if (phoneNorm.startsWith("0") && phoneNorm.length >= 9) {
      candidates.add(`855${phoneNorm.slice(1)}`);
    }
  }

  const aliasEmail =
    LEGACY_IDENTIFIER_ALIASES[lower] ||
    (phoneNorm ? LEGACY_IDENTIFIER_ALIASES[phoneNorm] : undefined);
  if (aliasEmail) {
    candidates.add(aliasEmail);
  }

  return Array.from(candidates).slice(0, 10);
}

export async function findUserByIdentifier(identifier: string): Promise<{
  id: string;
  data: FirestoreUserDoc;
} | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const phoneNorm = normalizePhone(trimmed);
  const candidates = expandIdentifierLookupCandidates(trimmed);
  const aliasEmail =
    LEGACY_IDENTIFIER_ALIASES[lower] ||
    (phoneNorm ? LEGACY_IDENTIFIER_ALIASES[phoneNorm] : undefined);

  const col = usersCol();

  // 1. Single indexed array-contains-any query using normalized `loginKeys`
  if (candidates.length > 0) {
    const keySnap = await col
      .where("loginKeys", "array-contains-any", candidates)
      .limit(1)
      .get();
    const matched = keySnap.docs[0];
    if (matched) {
      return { id: matched.id, data: matched.data() };
    }
  }

  // 2. Targeted equality fallback for legacy user documents missing `loginKeys`
  const queries = [
    col.where("email", "==", lower).limit(1).get(),
    col.where("username", "==", lower).limit(1).get(),
  ];
  if (aliasEmail) {
    queries.push(col.where("email", "==", aliasEmail).limit(1).get());
  }
  if (phoneNorm.length >= 6) {
    queries.push(col.where("phone", "==", phoneNorm).limit(1).get());
    queries.push(col.where("email", "==", phoneNorm).limit(1).get());
    queries.push(col.where("username", "==", phoneNorm).limit(1).get());
  }

  const snaps = await Promise.all(queries);
  for (const snap of snaps) {
    const doc = snap.docs[0];
    if (doc) {
      const data = doc.data();
      if (!data.loginKeys || data.loginKeys.length === 0) {
        const backfilled = buildUserLoginKeys(data);
        if (backfilled.length > 0) {
          void doc.ref
            .update({ loginKeys: backfilled })
            .catch(() => undefined);
        }
      }
      return { id: doc.id, data };
    }
  }

  return null;
}

export { FieldValue };

/**
 * Commits an array of batch mutations in chunks of 450 (below Firestore's 500-op limit).
 */
export async function commitBatchedWrites(
  ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>
): Promise<void> {
  if (ops.length === 0) return;
  const db = getDb();
  const chunkSize = 450;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + chunkSize)) {
      op(batch);
    }
    await batch.commit();
  }
}

export type { DocumentData };
