import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

const pool = new Pool({
    connectionString: config.databaseUrl,
});

pool.on('error', (error) => {
    console.error('[community-service] Unexpected database pool error:', error);
});

export default pool;// Kết nối PostgreSQL, chỉ vào community_db
