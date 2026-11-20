// Repository: truy vấn SQL vào report_db
import { pool } from '../config/database.js';

export const AuditLogRepository = {
  async insert(e) {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, family_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [e.user_id, e.action, e.entity_type, e.entity_id, e.family_id],
    );
  },

  /** filters: user_id, action, entity_type, entity_id, from, to; order: 'ASC' | 'DESC' */
  async find(filters, { order = 'DESC', limit = 50, offset = 0 } = {}) {
    const conds = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      conds.push(sql.replace('?', `$${params.length}`));
    };
    if (filters.user_id) add('user_id = ?', filters.user_id);
    if (filters.action) add('action = ?', filters.action);
    if (filters.entity_type) add('entity_type = ?', filters.entity_type);
    if (filters.entity_id) add('entity_id = ?', filters.entity_id);
    if (filters.from) add('created_at >= ?', filters.from);
    if (filters.to) add('created_at <= ?', filters.to);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit, offset);
    const dir = order === 'ASC' ? 'ASC' : 'DESC'; // chỉ nhận hai giá trị cố định
    const { rows } = await pool.query(
      `SELECT * FROM audit_log ${where}
       ORDER BY created_at ${dir}, audit_id ${dir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  },

  /** Thống kê nhật ký; familyId tùy chọn. */
  async stats(familyId) {
    const where = familyId ? 'WHERE family_id = $1' : '';
    const params = familyId ? [familyId] : [];
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS audit_count,
              COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS audit_last_24h_count
       FROM audit_log ${where}`,
      params,
    );
    const byAction = await pool.query(
      `SELECT action, COUNT(*)::int AS n FROM audit_log ${where} GROUP BY action ORDER BY n DESC, action`,
      params,
    );
    return { ...totals.rows[0], audit_by_action: Object.fromEntries(byAction.rows.map((r) => [r.action, r.n])) };
  },
};
