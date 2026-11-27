try {
  process.loadEnvFile?.();
} catch {
  // .env is optional if environment variables are already loaded
}

import { isPakKhlangVenue, syncTenantDefaultCatalog } from "../src/lib/default-catalog";
import {
  buildUserLoginKeys,
  categoriesCol,
  commitBatchedWrites,
  extractFirestoreMediaId,
  formatCambodiaDateKey,
  getDb,
  mediaCol,
  menuItemsCol,
  scanEventsCol,
  scanStatsCol,
  tenantsCol,
  tenantSlugsCol,
  toDate,
  usersCol,
} from "../src/lib/firestore";
import { resolveCategoryPricingMode } from "../src/lib/i18n";

const pruneMedia = process.argv.includes("--prune-media");
const pruneExpiredScans = process.argv.includes("--prune-expired-scans");
const syncCatalog = process.argv.includes("--sync-catalog");
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

async function migrateUsers(): Promise<number> {
  const snap = await usersCol().get();
  const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const expectedKeys = buildUserLoginKeys({
      email: data.email,
      username: data.username,
      phone: data.phone,
    });
    const existingKeys = Array.isArray(data.loginKeys) ? data.loginKeys : [];
    const same =
      existingKeys.length === expectedKeys.length &&
      expectedKeys.every((k, idx) => existingKeys[idx] === k);

    if (!same) {
      ops.push((b) =>
        b.update(doc.ref, {
          loginKeys: expectedKeys,
          updatedAt: new Date(),
        })
      );
    }
  }

  await commitBatchedWrites(ops);
  return ops.length;
}

async function migrateTenants(): Promise<{
  slugsBackfilled: number;
  categoriesUpdated: number;
  scanEventsTtlAdded: number;
  scanStatsDocsWritten: number;
  expiredScansPruned: number;
  orphanedMediaFound: number;
  orphanedMediaPruned: number;
}> {
  const tenantsSnap = await tenantsCol().get();
  const now = new Date();
  let slugsBackfilled = 0;
  let categoriesUpdated = 0;
  let scanEventsTtlAdded = 0;
  let scanStatsDocsWritten = 0;
  let expiredScansPruned = 0;
  let orphanedMediaFound = 0;
  let orphanedMediaPruned = 0;

  for (const tenantSnap of tenantsSnap.docs) {
    let tenant = tenantSnap.data();
    const tenantId = tenantSnap.id;

    if (
      syncCatalog &&
      (isPakKhlangVenue(tenant) || tenant.slug === "kep-bay-kitchen")
    ) {
      tenant = await syncTenantDefaultCatalog(tenantId, tenant, {
        preserveCustomItems: true,
      });
    }

    const cleanSlug = tenant.slug.trim().toLowerCase();
    const slugRef = tenantSlugsCol().doc(cleanSlug);
    const slugSnap = await slugRef.get();
    if (!slugSnap.exists || slugSnap.data()?.tenantId !== tenantId) {
      await slugRef.set({ tenantId, slug: cleanSlug, updatedAt: now });
      slugsBackfilled++;
    }

    // Backfill category pricingMode
    const catsSnap = await categoriesCol(tenantId).get();
    const catOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    for (const catDoc of catsSnap.docs) {
      const cat = catDoc.data();
      const resolvedMode = resolveCategoryPricingMode({
        id: catDoc.id,
        pricingMode: cat.pricingMode,
        name: cat.name,
        nameKm: cat.nameKm,
        nameEn: cat.nameEn,
      });
      if (cat.pricingMode !== resolvedMode) {
        catOps.push((b) =>
          b.update(catDoc.ref, {
            pricingMode: resolvedMode,
            updatedAt: now,
          })
        );
      }
    }
    if (catOps.length > 0) {
      await commitBatchedWrites(catOps);
      categoriesUpdated += catOps.length;
    }

    // Backfill scanStats + scanEvents TTL expiresAt
    const [scanEventsSnap, existingStatsSnap] = await Promise.all([
      scanEventsCol(tenantId).get(),
      scanStatsCol(tenantId).get(),
    ]);

    const scanOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
    const dailyMap = new Map<
      string,
      { totalScans: number; tableCounts: Record<string, number> }
    >();

    for (const scanDoc of scanEventsSnap.docs) {
      const scan = scanDoc.data();
      const scannedAt = toDate(scan.scannedAt);
      const dateKey = formatCambodiaDateKey(scannedAt);
      const bucket = dailyMap.get(dateKey) ?? {
        totalScans: 0,
        tableCounts: {},
      };
      bucket.totalScans += 1;
      if (scan.tableCode && scan.tableCode.trim()) {
        bucket.tableCounts[scan.tableCode] =
          (bucket.tableCounts[scan.tableCode] ?? 0) + 1;
      }
      dailyMap.set(dateKey, bucket);

      if (!scan.expiresAt && scannedAt.getTime() > 0) {
        scanOps.push((b) =>
          b.update(scanDoc.ref, {
            expiresAt: new Date(scannedAt.getTime() + TTL_MS),
          })
        );
        scanEventsTtlAdded++;
      }
    }

    if (existingStatsSnap.empty && dailyMap.size > 0) {
      for (const [dateKey, stat] of dailyMap.entries()) {
        scanOps.push((b) =>
          b.set(scanStatsCol(tenantId).doc(dateKey), {
            tenantId,
            date: dateKey,
            totalScans: stat.totalScans,
            tableCounts: stat.tableCounts,
            updatedAt: now,
          })
        );
        scanStatsDocsWritten++;
      }
    }

    // On Spark free plan (no server-side Firestore TTL policy), allow explicit pruning
    // of raw scanEvents once `scanStats` aggregates exist for the tenant.
    if (pruneExpiredScans && (!existingStatsSnap.empty || dailyMap.size > 0)) {
      for (const scanDoc of scanEventsSnap.docs) {
        const scan = scanDoc.data();
        const expiresAt = scan.expiresAt ? toDate(scan.expiresAt) : null;
        if (expiresAt && expiresAt.getTime() > 0 && expiresAt.getTime() < now.getTime()) {
          scanOps.push((b) => b.delete(scanDoc.ref));
          expiredScansPruned++;
        }
      }
    }
    await commitBatchedWrites(scanOps);

    // Check orphaned media docs in Firestore
    const [mediaSnap, itemsSnap] = await Promise.all([
      mediaCol(tenantId).select().get(),
      menuItemsCol(tenantId).select("imageUrl").get(),
    ]);
    if (!mediaSnap.empty) {
      const referencedIds = new Set<string>();
      const logoId = extractFirestoreMediaId(tenant.logoUrl, tenantId);
      const coverId = extractFirestoreMediaId(tenant.coverUrl, tenantId);
      if (logoId) referencedIds.add(logoId);
      if (coverId) referencedIds.add(coverId);

      for (const itemDoc of itemsSnap.docs) {
        const mediaId = extractFirestoreMediaId(
          itemDoc.data().imageUrl,
          tenantId
        );
        if (mediaId) referencedIds.add(mediaId);
      }

      const orphanRefs = mediaSnap.docs
        .filter((d) => !referencedIds.has(d.id))
        .map((d) => d.ref);

      orphanedMediaFound += orphanRefs.length;
      if (pruneMedia && orphanRefs.length > 0) {
        await commitBatchedWrites(
          orphanRefs.map((ref) => (b) => b.delete(ref))
        );
        orphanedMediaPruned += orphanRefs.length;
      }
    }
  }

  return {
    slugsBackfilled,
    categoriesUpdated,
    scanEventsTtlAdded,
    scanStatsDocsWritten,
    expiredScansPruned,
    orphanedMediaFound,
    orphanedMediaPruned,
  };
}

async function main() {
  getDb();
  console.log("Running MenuOS Cloud Firestore migration & health check...");
  const usersUpdated = await migrateUsers();
  const tenantStats = await migrateTenants();

  console.log("✓ Migration complete:");
  console.log(`  - Users loginKeys updated: ${usersUpdated}`);
  console.log(`  - Tenant slug locks backfilled: ${tenantStats.slugsBackfilled}`);
  console.log(`  - Categories pricingMode backfilled: ${tenantStats.categoriesUpdated}`);
  console.log(`  - Scan events TTL added: ${tenantStats.scanEventsTtlAdded}`);
  console.log(`  - Daily scanStats docs backfilled: ${tenantStats.scanStatsDocsWritten}`);
  console.log(`  - Expired raw scan events pruned: ${tenantStats.expiredScansPruned}`);
  console.log(
    `  - Orphaned Firestore media docs found: ${tenantStats.orphanedMediaFound} (pruned: ${tenantStats.orphanedMediaPruned})`
  );
  if (tenantStats.orphanedMediaFound > 0 && !pruneMedia) {
    console.log("  Tip: pass --prune-media to delete orphaned Firestore media docs.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
