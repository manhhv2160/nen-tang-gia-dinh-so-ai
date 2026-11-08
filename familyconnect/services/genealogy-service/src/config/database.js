import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://genealogy_svc:genealogy_dev_pw@localhost:5432/genealogy_db',
});

pool.on('error', (error) => {
    console.error('[genealogy-service] Unexpected database pool error:', error);
});

export default pool;
