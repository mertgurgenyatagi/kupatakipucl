export interface CompressImageOptions {
  /** Longest side, in pixels, to downscale to (aspect ratio preserved). */
  maxDimension: number;
  quality?: number;
}

/**
 * Downscales + recompresses an image client-side before upload. Profile
 * photos and forum images only ever render in small frames, so there's no
 * reason to ship whatever multi-megapixel original a phone camera produced.
 * Falls back to the original file untouched if canvas/createImageBitmap
 * aren't available (older browsers, or a test environment) rather than
 * blocking the upload on a missing capability.
 */
export async function compressImage(file: File, { maxDimension, quality = 0.82 }: CompressImageOptions): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch (err) {
    console.error("Image compression failed, uploading original", err);
    return file;
  }
}
