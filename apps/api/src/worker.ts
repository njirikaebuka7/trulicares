import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import { createBullConnection, redisEnabled } from './services/redis.js';
import { QUEUE_NAMES, scheduleCleanupJobs } from './queues/queues.js';
import { sendEmail } from './services/email.js';
import { processImage } from './queues/processors/image.js';
import { processNotification } from './queues/processors/notification.js';
import { processCleanup } from './queues/processors/cleanup.js';
import { processReport } from './queues/processors/report.js';

/**
 * Standalone worker process. Run with `npm run worker` (prod) / `npm run worker:dev`.
 * Deploy to an always-on host (Railway/Render/Fly) — NOT Vercel serverless.
 */

const PREFIX = process.env.QUEUE_PREFIX || 'trulicares';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

if (!redisEnabled()) {
  console.error('✗ REDIS_URL is not set. The worker requires Redis. Exiting.');
  process.exit(1);
}

/** Redacted failure logging — never logs job payloads (may contain PII). */
function logFailure(queue: string, job: Job | undefined, err: Error) {
  console.error(
    `[worker:${queue}] job ${job?.name ?? '?'}#${job?.id ?? '?'} failed ` +
      `(attempt ${job?.attemptsMade ?? '?'}/${job?.opts?.attempts ?? '?'}): ${err.message}`
  );
}

const workers: Worker[] = [];
function makeWorker(name: string, processor: (job: Job) => Promise<unknown>) {
  const connection = createBullConnection()!;
  // `as any`: bullmq bundles its own ioredis copy (structural type mismatch only).
  const w = new Worker(name, processor, { connection: connection as any, prefix: PREFIX, concurrency: CONCURRENCY });
  w.on('completed', (job) => console.log(`[worker:${name}] ✓ ${job.name}#${job.id}`));
  w.on('failed', (job, err) => logFailure(name, job, err));
  w.on('error', (err) => console.error(`[worker:${name}] error:`, err.message));
  workers.push(w);
  return w;
}

makeWorker(QUEUE_NAMES.email, async (job) => sendEmail(job.data));
makeWorker(QUEUE_NAMES.image, async (job) => processImage(job.data));
makeWorker(QUEUE_NAMES.notification, async (job) => processNotification(job.data));
makeWorker(QUEUE_NAMES.cleanup, async (job) => processCleanup(job.name));
makeWorker(QUEUE_NAMES.report, async (job) => processReport(job.data));

await scheduleCleanupJobs();

console.log(`✓ TruliCares worker started (concurrency=${CONCURRENCY}, prefix=${PREFIX})`);
console.log(`  queues: ${Object.values(QUEUE_NAMES).join(', ')}`);

async function shutdown(signal: string) {
  console.log(`\n[worker] ${signal} received, closing…`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
