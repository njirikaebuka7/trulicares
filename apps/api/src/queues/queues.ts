import { Queue, type JobsOptions } from 'bullmq';
import { createBullConnection, redisEnabled } from '../services/redis.js';
import type { EmailTemplate } from '../services/emailTemplates.js';

/**
 * Queue producers. The API enqueues jobs here; the worker process (worker.ts) consumes
 * them. When Redis is NOT configured, each producer falls back to running the task
 * inline (best-effort, non-blocking) so the app keeps working on a single instance.
 */

export const QUEUE_NAMES = {
  email: 'email',
  image: 'image',
  notification: 'notification',
  cleanup: 'cleanup',
  report: 'report',
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const PREFIX = process.env.QUEUE_PREFIX || 'trulicares';

/**
 * Inline mode: run jobs directly in the API process instead of enqueuing for a worker.
 * Set INLINE_JOBS=true when you don't run a separate worker (keeps email/jobs working
 * with zero extra infra). Redis is still used for cache + rate limiting either way.
 */
const inlineMode = () => process.env.INLINE_JOBS === 'true';

const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 1000, age: 24 * 3600 },
  removeOnFail: { count: 5000 },
};

// Lazily-created singleton queues (one connection per queue, reused across warm calls).
const queues = new Map<QueueName, Queue>();
function getQueue(name: QueueName): Queue | null {
  if (!redisEnabled()) return null;
  if (queues.has(name)) return queues.get(name)!;
  const connection = createBullConnection();
  if (!connection) return null;
  // `connection as any`: bullmq bundles its own ioredis copy, so the instance types
  // differ structurally though the runtime API is identical.
  const q = new Queue(name, { connection: connection as any, prefix: PREFIX, defaultJobOptions: DEFAULT_JOB_OPTS });
  queues.set(name, q);
  return q;
}

// ── Email ────────────────────────────────────────────────────
export interface EmailJob {
  template: EmailTemplate;
  to: string;
  data?: Record<string, any>;
}

export async function enqueueEmail(template: EmailTemplate, to: string, data: Record<string, any> = {}): Promise<void> {
  if (!to) return;
  const q = inlineMode() ? null : getQueue('email');
  if (q) {
    await q.add('send', { template, to, data } satisfies EmailJob, {
      jobId: `email:${template}:${to}:${Date.now()}`,
    });
    return;
  }
  // Inline send (INLINE_JOBS=true, or no worker/Redis). Dynamic import avoids a cycle.
  await import('../services/email.js')
    .then(({ sendEmail }) => sendEmail({ template, to, data }))
    .catch((err) => console.error('[email inline] send failed:', err?.message));
}

// ── Image optimization ───────────────────────────────────────
export interface ImageJob {
  userId: string;
  bucket: string;
  path: string;
}
export async function enqueueImageOptimize(job: ImageJob): Promise<void> {
  const q = getQueue('image');
  if (q) {
    await q.add('optimize', job);
    return;
  }
  // No fallback needed: storage.ts already optimizes avatars inline before upload.
}

// ── Notification fan-out ─────────────────────────────────────
export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  content: string;
  /** Optional email mirror of the in-app notification. */
  email?: { template: EmailTemplate; to: string; data?: Record<string, any> };
  /** Optional realtime broadcast channel + event. */
  broadcast?: { channel: string; event: string; payload?: Record<string, any> };
}
export async function enqueueNotification(job: NotificationJob): Promise<void> {
  const q = inlineMode() ? null : getQueue('notification');
  if (q) {
    await q.add('fan-out', job);
    return;
  }
  await import('./processors/notification.js')
    .then(({ processNotification }) => processNotification(job))
    .catch((err) => console.error('[notification inline] failed:', err?.message));
}

// ── Report generation ────────────────────────────────────────
export interface ReportJob {
  kind: 'admin-analytics-export';
  requestedBy: string;
  params?: Record<string, any>;
}
export async function enqueueReport(job: ReportJob): Promise<string | null> {
  const q = getQueue('report');
  if (!q) return null;
  const added = await q.add('generate', job);
  return added.id ?? null;
}

/**
 * Registers repeatable cleanup jobs (idempotent). Called once by the worker on boot.
 * No-op without Redis.
 */
export async function scheduleCleanupJobs(): Promise<void> {
  const q = getQueue('cleanup');
  if (!q) return;
  await q.add('purge-expired-otps', {}, { repeat: { pattern: '*/15 * * * *' }, jobId: 'purge-expired-otps' });
  await q.add('release-stuck-escrow', {}, { repeat: { pattern: '0 * * * *' }, jobId: 'release-stuck-escrow' });
  await q.add('prune-reset-tokens', {}, { repeat: { pattern: '0 */6 * * *' }, jobId: 'prune-reset-tokens' });
  console.log('[queues] cleanup jobs scheduled');
}
