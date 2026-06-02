/**
 * Image optimization via sharp. Dynamically imported so a missing/incompatible native
 * binary never crashes the API at import time — callers get the original buffer back.
 */

export interface OptimizeOptions {
  maxSize?: number; // longest edge, px
  quality?: number; // webp quality 1-100
}

export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
  optimized: boolean;
}

/** Resizes (contain) to maxSize and converts to webp. Falls back to the input on failure. */
export async function optimizeImageBuffer(
  input: Buffer,
  contentType: string,
  opts: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const maxSize = opts.maxSize ?? 512;
  const quality = opts.quality ?? 80;
  try {
    const { default: sharp } = await import('sharp');
    const buffer = await sharp(input, { failOn: 'none' })
      .rotate() // honor EXIF orientation
      .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    return { buffer, contentType: 'image/webp', extension: 'webp', optimized: true };
  } catch (err: any) {
    console.warn('[image] sharp optimization skipped:', err?.message);
    const extension = (contentType.split('/')[1] || 'png').replace('jpeg', 'jpg');
    return { buffer: input, contentType, extension, optimized: false };
  }
}
