import pool from '../config/database.js';

export async function listByFamily(familyId, { limit, offset, sortDirection }) {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM branch WHERE family_id = $1', [familyId]);
    const result = await pool.query(
        `SELECT * FROM branch WHERE family_id = $1
         ORDER BY branch_name ${sortDirection}, branch_id ASC LIMIT $2 OFFSET $3`,
        [familyId, limit, offset],
    );
    return { rows: result.rows, total: countResult.rows[0].total };
}

export async function findById(branchId) {
    const result = await pool.query('SELECT * FROM branch WHERE branch_id = $1', [branchId]);
    return result.rows[0] ?? null;
}

export async function create({ family_id, branch_name, description }) {
    const result = await pool.query(
        `INSERT INTO branch (family_id, branch_name, description)
         VALUES ($1, $2, $3) RETURNING *`,
        [family_id, branch_name, description],
    );
    return result.rows[0];
}

export async function update(branchId, changes) {
    const entries = Object.entries(changes).filter(([key]) => ['branch_name', 'description'].includes(key));
    if (!entries.length) return findById(branchId);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(branchId);
    const result = await pool.query(
        `UPDATE branch SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE branch_id = $${values.length} RETURNING *`,
        values,
    );
    return result.rows[0] ?? null;
}

export async function remove(branchId) {
    const result = await pool.query('DELETE FROM branch WHERE branch_id = $1 RETURNING branch_id', [branchId]);
    return result.rowCount > 0;
}
