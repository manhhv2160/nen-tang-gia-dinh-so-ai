import pool from '../config/database.js';

export async function list({ userId, systemAdmin, limit, offset, sortDirection, query }) {
    const conditions = [];
    const values = [];
    if (!systemAdmin) {
        values.push(userId);
        conditions.push(`EXISTS (SELECT 1 FROM member m WHERE m.family_id = f.family_id AND m.user_id = $${values.length})`);
    }
    if (query) {
        values.push(`%${query}%`);
        conditions.push(`f.family_name ILIKE $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM family f ${where}`,
        values,
    );
    const paginationValues = [...values, limit, offset];
    const result = await pool.query(
        `SELECT f.* FROM family f ${where} ORDER BY f.family_name ${sortDirection}, f.family_id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        paginationValues,
    );
    return { rows: result.rows, total: countResult.rows[0].total };
}

export async function findById(familyId) {
    const result = await pool.query('SELECT * FROM family WHERE family_id = $1', [familyId]);
    return result.rows[0] ?? null;
}

export async function create({ user_id, family_name, description, origin_place }) {
    const result = await pool.query(
        `INSERT INTO family (user_id, family_name, description, origin_place)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [user_id, family_name, description, origin_place],
    );
    return result.rows[0];
}

export async function update(familyId, changes) {
    const columns = { family_name: 'family_name', description: 'description', origin_place: 'origin_place' };
    const entries = Object.entries(changes).filter(([key]) => columns[key]);
    if (!entries.length) return findById(familyId);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 1}`);
    values.push(familyId);
    const result = await pool.query(
        `UPDATE family SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE family_id = $${values.length} RETURNING *`,
        values,
    );
    return result.rows[0] ?? null;
}

export async function remove(familyId) {
    const result = await pool.query('DELETE FROM family WHERE family_id = $1 RETURNING family_id', [familyId]);
    return result.rowCount > 0;
}
