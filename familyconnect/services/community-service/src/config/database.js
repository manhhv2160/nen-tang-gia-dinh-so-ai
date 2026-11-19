// Kết nối PostgreSQL, chỉ vào community_db (mỗi service chỉ đọc database của mình).
import pg from 'pg';
import config from './index.js';

// Cột TIMESTAMP (không múi giờ) được hiểu là UTC, để created_at luôn ra dạng ISO 8601 UTC
// dù máy chủ ở múi giờ nào.
pg.types.setTypeParser(1114, (value) => new Date(`${value.replace(' ', 'T')}Z`));

const { Pool } = pg;

const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
});

pool.on('error', (error) => {
    console.error('[community-service] Unexpected database pool error:', error);
});

export default pool;
