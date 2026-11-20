// Kết nối PostgreSQL, chỉ vào report_db
import pg from 'pg';
import { config } from './index.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
