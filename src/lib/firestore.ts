import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type Firestore,
} from "firebase-admin/firestore";
import type {
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

  const db = getFirestore(getFirebaseAdminApp());
  if (!globalForFirestore.firestoreSettingsApplied) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
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

export async function findTenantBySlug(slug: string): Promise<{
  id: string;
  data: FirestoreTenantDoc;
} | null> {
  const snap = await tenantsCol()
    .where("slug", "==", slug.toLowerCase())
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, data: doc.data() };
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  data: FirestoreUserDoc;
} | null> {
  const snap = await usersCol()
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, data: doc.data() };
}

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
