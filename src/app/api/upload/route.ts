import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { Storage } from "@google-cloud/storage";
import { resolveAdminContext } from "@/lib/auth";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

let gcsStorage: Storage | null = null;
function getGcsStorage(): Storage {
  if (!gcsStorage) {
    gcsStorage = new Storage();
  }
  return gcsStorage;
}

export async function POST(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing image file in upload" },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported format. Use PNG, JPG, WebP, or SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 5MB limit." },
        { status: 400 }
      );
    }

    const safeTenantSegment = ctx.tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // Production / Firebase App Hosting: persist uploads in Firebase Storage (GCS)
    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

    if (bucketName) {
      const objectPath = `tenants/${safeTenantSegment}/${filename}`;
      const downloadToken = crypto.randomUUID();
      const bucket = getGcsStorage().bucket(bucketName);
      const blob = bucket.file(objectPath);

      await blob.save(bytes, {
        resumable: false,
        metadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000, immutable",
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
      });

      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
        bucketName
      )}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;

      return NextResponse.json({ url: publicUrl });
    }

    // Local development fallback (filesystem)
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      safeTenantSegment
    );
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({
      url: `/uploads/${safeTenantSegment}/${filename}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to save uploaded image" },
      { status: 500 }
    );
  }
}
