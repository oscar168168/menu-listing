"use client";

const MAX_BYTES_WITHOUT_RESIZE = 320 * 1024; // 320KB
const TARGET_MAX_BYTES = 750 * 1024; // Safely under 900KB Firestore limit

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode image"));
    };
    img.src = objectUrl;
  });
}

/**
 * Resizes and compresses large raster photos client-side before upload so
 * smartphone photos (3–10MB) upload fast and fit inside free Firestore media storage.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1200
): Promise<File> {
  if (file.type === "image/svg+xml") {
    return file;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    return file;
  }

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Keep small files crisp & untouched (including transparent PNG logos)
  if (
    file.size <= MAX_BYTES_WITHOUT_RESIZE &&
    width <= maxDimension &&
    height <= maxDimension
  ) {
    return file;
  }

  const attempts: Array<{ maxDim: number; quality: number }> = [
    { maxDim: maxDimension, quality: 0.84 },
    { maxDim: 960, quality: 0.72 },
    { maxDim: 720, quality: 0.62 },
  ];

  const baseName = file.name.replace(/\.[^.]+$/, "") || "dish-photo";

  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Prefer WebP for smaller size + transparency support, fall back to JPEG
    const webpBlob = await canvasToBlob(canvas, "image/webp", attempt.quality);
    if (webpBlob && webpBlob.size <= TARGET_MAX_BYTES) {
      return new File([webpBlob], `${baseName}.webp`, { type: "image/webp" });
    }

    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", attempt.quality);
    if (jpegBlob && jpegBlob.size <= TARGET_MAX_BYTES) {
      return new File([jpegBlob], `${baseName}.jpg`, { type: "image/jpeg" });
    }
  }

  return file;
}
