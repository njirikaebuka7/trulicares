import { query } from '../../db.js';
import type { ReportJob } from '../queues.js';

/**
 * Heavy analytics aggregation, kept off the request path. Returns a JSON snapshot that
 * the dashboard can poll/download. (Extend to write a CSV to Storage as needed.)
 */
export async function processReport(job: ReportJob): Promise<Record<string, any>> {
  if (job.kind !== 'admin-analytics-export') throw new Error(`unknown report kind: ${job.kind}`);

  const [users, revenue, shifts] = await Promise.all([
    query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),
    query(`SELECT COALESCE(SUM(amount_cents),0)::bigint AS cents FROM payments WHERE status = 'succeeded'`),
    query(`SELECT status, COUNT(*)::int AS count FROM shifts GROUP BY status`),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    requestedBy: job.requestedBy,
    usersByRole: users.rows,
    totalRevenueUsd: Number(revenue.rows[0]?.cents || 0) / 100,
    shiftsByStatus: shifts.rows,
  };
}
