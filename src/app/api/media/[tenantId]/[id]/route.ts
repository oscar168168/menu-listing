import { NextRequest, NextResponse } from "next/server";
import { mediaCol } from "@/lib/firestore";

const SAFE_SEGMENT_RE = /^[a-zA-Z0-9_-]{1,128}$/;

interface RouteParams {
  params: Promise<{ tenantId: string; id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, id } = await params;

  if (!SAFE_SEGMENT_RE.test(tenantId) || !SAFE_SEGMENT_RE.test(id)) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }

  try {
    const snap = await mediaCol(tenantId).doc(id).get();
    const doc = snap.data();

    if (!snap.exists || !doc || !doc.data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bytes =
      doc.data instanceof Uint8Array
        ? doc.data
        : new Uint8Array(Buffer.from(doc.data));

    const headers: Record<string, string> = {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    if (doc.mimeType === "image/svg+xml") {
      headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Media serve error:", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}
