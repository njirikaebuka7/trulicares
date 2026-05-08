import { Router } from 'express';
import { query } from '../db.js';
import { requireCaregiver } from '../middleware/auth.js';
const router = Router();
// GET /api/earnings
router.get('/', requireCaregiver, async (req, res) => {
    try {
        const { id } = req.user;
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const result = await query(`SELECT
         SUM(CASE WHEN created_at >= $2 THEN amount_cents ELSE 0 END) as this_week,
         SUM(CASE WHEN created_at >= $3 AND created_at < $2 THEN amount_cents ELSE 0 END) as last_week,
         SUM(CASE WHEN created_at >= $4 THEN amount_cents ELSE 0 END) as this_month,
         SUM(CASE WHEN created_at >= $5 AND created_at < $4 THEN amount_cents ELSE 0 END) as last_month,
         SUM(CASE WHEN created_at >= $6 THEN amount_cents ELSE 0 END) as year_to_date,
         COUNT(*) as total_jobs
       FROM payments
       WHERE user_id = $1 AND status = 'succeeded'`, [id, startOfWeek.toISOString(), startOfLastWeek.toISOString(), startOfMonth.toISOString(), startOfLastMonth.toISOString(), startOfYear.toISOString()]);
        const row = result.rows[0];
        // Weekly breakdown (last 7 days)
        const weeklyResult = await query(`SELECT
         DATE(created_at) as day,
         SUM(amount_cents) as total
       FROM payments
       WHERE user_id = $1 AND status = 'succeeded'
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY day`, [id]);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyMap = new Map(weeklyResult.rows.map((r) => [r.day, parseInt(r.total) / 100]));
        const weeklyData = days.map((label, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (d.getDay() - i + 7) % 7);
            const key = d.toISOString().split('T')[0];
            return { day: label, amount: weeklyMap.get(key) || 0 };
        });
        res.json({
            earnings: {
                thisWeek: Math.round((parseInt(row.this_week) || 0) / 100),
                lastWeek: Math.round((parseInt(row.last_week) || 0) / 100),
                thisMonth: Math.round((parseInt(row.this_month) || 0) / 100),
                lastMonth: Math.round((parseInt(row.last_month) || 0) / 100),
                totalYearToDate: Math.round((parseInt(row.year_to_date) || 0) / 100),
                totalJobs: parseInt(row.total_jobs) || 0,
                weeklyData,
            },
        });
    }
    catch (err) {
        console.error('Get earnings error:', err);
        res.status(500).json({ error: 'Failed to fetch earnings' });
    }
});
export default router;
