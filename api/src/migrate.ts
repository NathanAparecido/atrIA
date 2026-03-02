import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
    console.log('[Migrate] Starting database migrations...');

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const client = await pool.connect();

    try {
        // Create migrations tracking table
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

        for (const file of files) {
            // Check if already applied
            const existing = await client.query(
                'SELECT id FROM _migrations WHERE filename = $1',
                [file]
            );

            if (existing.rows.length > 0) {
                console.log(`[Migrate] Skipping (already applied): ${file}`);
                continue;
            }

            // Apply migration
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO _migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`[Migrate] Applied: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[Migrate] Failed on ${file}:`, err);
                throw err;
            }
        }

        console.log('[Migrate] All migrations complete!');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((err) => {
    console.error('[Migrate] Fatal error:', err);
    process.exit(1);
});
