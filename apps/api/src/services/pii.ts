/**
 * PII encryption at rest (AES-256-GCM).
 *
 * Used for sensitive identity data that must be stored but kept confidential:
 * government-ID images (base64), ID numbers, and background-check detail blobs.
 *
 * Gating: encryption activates only when PII_ENCRYPTION_KEY is configured (32 bytes,
 * supplied as 64 hex chars or base64). Without a key, values are stored as-is (the prior
 * behavior) and a one-time warning is logged — so existing deploys keep working until the
 * key is set, at which point all NEW writes are encrypted. Decryption is transparent and
 * back-compatible: plaintext (non-prefixed) values are returned unchanged.
 *
 * Token format: `enc:v1:<base64( iv[12] | authTag[16] | ciphertext )>`
 */
import crypto from 'crypto';

const PREFIX = 'enc:v1:';
let warned = false;

function getKey(): Buffer | null {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    // Accept 64-char hex or base64; must decode to exactly 32 bytes.
    const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
    console.error('PII_ENCRYPTION_KEY must decode to 32 bytes (got ' + buf.length + ').');
    return null;
  } catch {
    return null;
  }
}

export function isPiiEncryptionEnabled(): boolean {
  return getKey() !== null;
}

/** Encrypt a string. Returns an `enc:v1:` token, or the input unchanged if no key is set. */
export function encryptPII(plain: string | null | undefined): string | null {
  if (plain == null) return plain ?? null;
  const key = getKey();
  if (!key) {
    if (!warned) { console.warn('⚠ PII_ENCRYPTION_KEY not set — identity data stored unencrypted. Set it to enable encryption at rest.'); warned = true; }
    return plain;
  }
  if (typeof plain === 'string' && plain.startsWith(PREFIX)) return plain; // already encrypted
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

/** Decrypt an `enc:v1:` token. Plaintext (non-prefixed) values pass through unchanged. */
export function decryptPII(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string' || !value.startsWith(PREFIX)) return value ?? null;
  const key = getKey();
  if (!key) return '[encrypted — key unavailable]';
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return '[encrypted — could not decrypt]';
  }
}

/** Encrypt each entry of a string array (e.g. govt-ID document blobs). */
export function encryptArray(arr: unknown): string[] | null {
  if (!Array.isArray(arr)) return null;
  return arr.map((v) => encryptPII(String(v)) as string);
}

/** Decrypt each entry of a string array. */
export function decryptArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((v) => decryptPII(String(v)) as string);
}
