import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resolveAdminContext } from "@/lib/auth";
import { mediaCol } from "@/lib/firestore";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const MAX_CLOUDINARY_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_FIRESTORE_MEDIA_BYTES = 900 * 1024; // Fits safely inside Firestore's 1 MiB document limit

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function parseCloudinaryConfig(): CloudinaryConfig | null {
  const rawUrl = process.env.CLOUDINARY_URL?.trim();
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (
        parsed.protocol === "cloudinary:" &&
        parsed.username &&
        parsed.password &&
        parsed.hostname
      ) {
        return {
          cloudName: parsed.hostname,
          apiKey: decodeURIComponent(parsed.username),
          apiSecret: decodeURIComponent(parsed.password),
        };
      }
    } catch {
      // fall through to individual env vars
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }
  return null;
}

async function uploadToCloudinary(
  cfg: CloudinaryConfig,
  bytes: Buffer,
  mimeType: string,
  folder: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signaturePayload)
    .digest("hex");

  const form = new FormData();
  form.append("file", `data:${mimeType};base64,${bytes.toString("base64")}`);
  form.append("folder", folder);
  form.append("timestamp", timestamp);
  form.append("api_key", cfg.apiKey);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }
  return data.secure_url;
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

    if (file.size > MAX_CLOUDINARY_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 5MB limit." },
        { status: 400 }
      );
    }

    const safeTenantSegment = ctx.tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
    const bytes = Buffer.from(await file.arrayBuffer());

    // Optional external cloud image hosting via Cloudinary
    const cloudinary = parseCloudinaryConfig();
    if (cloudinary) {
      const publicUrl = await uploadToCloudinary(
        cloudinary,
        bytes,
        file.type,
        `menu-listing/${safeTenantSegment}`
      );
      return NextResponse.json({ url: publicUrl });
    }

    // Default free storage: persist optimized images directly in Cloud Firestore
    if (bytes.byteLength > MAX_FIRESTORE_MEDIA_BYTES) {
      return NextResponse.json(
        {
          error:
            "Image exceeds 900KB built-in limit after compression. Try a smaller image or paste an image URL.",
        },
        { status: 400 }
      );
    }

    const mediaRef = mediaCol(safeTenantSegment).doc();
    await mediaRef.set({
      tenantId: safeTenantSegment,
      mimeType: file.type,
      size: bytes.byteLength,
      data: bytes,
      createdAt: new Date(),
    });

    return NextResponse.json({
      url: `/api/media/${safeTenantSegment}/${mediaRef.id}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to save uploaded image" },
      { status: 500 }
    );
  }
}
