import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

const pool = new Pool({
    connectionString: config.databaseUrl,
});

pool.on('error', (error) => {
    console.error('[genealogy-service] Unexpected database pool error:', error);
});

export default pool;
