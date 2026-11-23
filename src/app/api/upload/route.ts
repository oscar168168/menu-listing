import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { resolveAdminContext } from "@/lib/auth";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
      if (parsed.protocol === "cloudinary:" && parsed.username && parsed.password && parsed.hostname) {
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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 5MB limit." },
        { status: 400 }
      );
    }

    const safeTenantSegment = ctx.tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
    const bytes = Buffer.from(await file.arrayBuffer());

    // Optional free-tier cloud image hosting via Cloudinary
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

    // Serverless environments (e.g., Vercel Hobby) have a read-only filesystem
    if (process.env.VERCEL === "1") {
      return NextResponse.json(
        {
          error:
            "Set CLOUDINARY_URL in Vercel Environment Variables for file uploads, or paste an image URL.",
        },
        { status: 501 }
      );
    }

    // Local development fallback (filesystem)
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
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
