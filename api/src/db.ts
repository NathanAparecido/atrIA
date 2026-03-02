import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
    user: process.env.POSTGRES_USER || 'atria',
    password: process.env.POSTGRES_PASSWORD || 'atriadev123',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'atria',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client:', err);
});

export async function query(text: string, params?: unknown[]) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
        console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return result;
}

export async function getClient() {
    const client = await pool.connect();
    return client;
}
