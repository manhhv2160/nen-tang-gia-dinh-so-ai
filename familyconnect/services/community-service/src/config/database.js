// Kết nối PostgreSQL, chỉ vào community_db (mỗi service chỉ đọc database của mình).
import pg from 'pg';

// Cột TIMESTAMP (không múi giờ) được hiểu là UTC, để created_at luôn ra dạng ISO 8601 UTC dù máy chạy ở múi giờ nào.
pg.types.setTypeParser(1114, (value) => new Date(`${value.replace(' ', 'T')}Z`));

export function createPool(databaseUrl, options = {}) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10, ...options });
  // Lỗi của kết nối đang rảnh không được làm sập tiến trình.
  pool.on('error', (err) => console.error('[community-service] Lỗi kết nối database:', err.message));
  return pool;
}
