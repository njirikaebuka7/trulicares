import { supabase } from '../supabaseClient.js';
import { optimizeImageBuffer } from './image.js';

/**
 * Uploads a base64 image data string directly to a public Supabase Storage bucket.
 * If the input is already an HTTP url, it is returned unchanged.
 *
 * @param userId - ID of the user uploading the photo
 * @param base64String - base64 representation of the image
 * @returns The public URL of the uploaded image asset
 */
export async function uploadBase64Image(userId: string, base64String: string): Promise<string> {
  if (!base64String) return '';

  // If the input is already a normal URL or doesn't look like base64, return it as-is
  if (!base64String.startsWith('data:')) {
    return base64String;
  }

  // Parse mime-type and raw base64 data
  const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) {
    return base64String;
  }

  const rawMimeType = matches[1];
  const base64Data = matches[2];
  const rawBuffer = Buffer.from(base64Data, 'base64');

  // Optimize: resize + convert to webp (shrinks Storage footprint dramatically).
  // Falls back to the original buffer if sharp is unavailable.
  const optimized = await optimizeImageBuffer(rawBuffer, rawMimeType, { maxSize: 512, quality: 80 });
  const buffer = optimized.buffer;
  const mimeType = optimized.contentType;
  const extension = optimized.extension;
  const fileName = `${userId}-${Date.now()}.${extension}`;

  try {
    // 1. Programmatically ensure bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'profile-photos');
      if (!bucketExists) {
        console.log('Creating public storage bucket: profile-photos');
        await supabase.storage.createBucket('profile-photos', {
          public: true,
          fileSizeLimit: 3000000, // 3MB limit
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
      }
    } catch (bucketErr: any) {
      // Catch and ignore if already exists or listBuckets is blocked
      console.warn('Bucket verification warning:', bucketErr.message);
    }

    // 2. Upload photo buffer
    console.log(`Uploading profile picture for user ${userId} to Supabase Storage...`);
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 3. Obtain public URL of uploaded asset
    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    if (!data?.publicUrl) {
      throw new Error('Failed to generate public URL from Supabase Storage');
    }

    console.log('Successfully uploaded profile photo. URL:', data.publicUrl);
    return data.publicUrl;
  } catch (err: any) {
    console.error('Failed to upload image to Supabase Storage:', err.message);
    // Safe fallback: Return original base64 if upload fails so the app doesn't break
    return base64String;
  }
}
