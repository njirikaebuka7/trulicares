import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
export async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
        console.warn('Slow query detected', { text: text.slice(0, 100), duration });
    }
    return result;
}
export async function getClient() {
    return pool.connect();
}
