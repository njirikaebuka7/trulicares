import { supabase } from '../../db.js';
import { optimizeImageBuffer } from '../../services/image.js';
import type { ImageJob } from '../queues.js';

/**
 * Heavy/bulk image optimization: download an already-uploaded object from Supabase
 * Storage, optimize it, and overwrite it in place. (Avatar uploads are already
 * optimized inline in storage.ts; this queue handles re-processing / large batches.)
 */
export async function processImage(job: ImageJob): Promise<void> {
  const { bucket, path } = job;
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`download failed: ${error?.message || 'no data'}`);

  const arrayBuf = await data.arrayBuffer();
  const input = Buffer.from(arrayBuf);
  const contentType = (data as any).type || 'image/png';

  const optimized = await optimizeImageBuffer(input, contentType, { maxSize: 512, quality: 80 });
  if (!optimized.optimized) return; // nothing to do

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, optimized.buffer, { contentType: optimized.contentType, upsert: true });
  if (upErr) throw new Error(`re-upload failed: ${upErr.message}`);
}
