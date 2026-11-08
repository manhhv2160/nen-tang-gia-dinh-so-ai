import pool from '../config/database.js';

export async function listByFamily(familyId, { filters, limit, offset, sortField, sortDirection }) {
    const conditions = ['family_id = $1'];
    const values = [familyId];
    const addCondition = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace('?', `$${values.length}`));
    };

    if (filters.branch_id !== undefined) addCondition('branch_id = ?', filters.branch_id);
    if (filters.generation !== undefined) addCondition('generation = ?', filters.generation);
    if (filters.gender !== undefined) addCondition('gender = ?', filters.gender);
    if (filters.is_verified !== undefined) addCondition('is_verified = ?', filters.is_verified);
    if (filters.occupation !== undefined) addCondition('occupation ILIKE ?', `%${filters.occupation}%`);
    if (filters.address !== undefined) addCondition('address ILIKE ?', `%${filters.address}%`);
    if (filters.q !== undefined) addCondition('full_name ILIKE ?', `%${filters.q}%`);

    const where = conditions.join(' AND ');
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM member WHERE ${where}`, values);
    const sortColumns = {
        full_name: 'full_name',
        generation: 'generation',
        date_of_birth: 'date_of_birth',
    };
    const result = await pool.query(
        `SELECT * FROM member WHERE ${where}
         ORDER BY ${sortColumns[sortField]} ${sortDirection} NULLS LAST, member_id ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset],
    );
    return { rows: result.rows, total: countResult.rows[0].total };
}

export async function findById(memberId) {
    const result = await pool.query('SELECT * FROM member WHERE member_id = $1', [memberId]);
    return result.rows[0] ?? null;
}

export async function create(member) {
    const fields = [
        'family_id', 'branch_id', 'full_name', 'gender', 'date_of_birth', 'date_of_death',
        'generation', 'occupation', 'education', 'address', 'bio',
    ];
    const result = await pool.query(
        `INSERT INTO member (${fields.join(', ')})
         VALUES (${fields.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
        fields.map((field) => member[field] ?? null),
    );
    return result.rows[0];
}

export async function update(memberId, changes) {
    const allowed = [
        'branch_id', 'full_name', 'gender', 'date_of_birth', 'date_of_death',
        'generation', 'occupation', 'education', 'address', 'bio',
    ];
    const entries = Object.entries(changes).filter(([key]) => allowed.includes(key));
    if (!entries.length) return findById(memberId);
    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(memberId);
    const result = await pool.query(
        `UPDATE member SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE member_id = $${values.length} RETURNING *`,
        values,
    );
    return result.rows[0] ?? null;
}

export async function remove(memberId) {
    const result = await pool.query('DELETE FROM member WHERE member_id = $1 RETURNING member_id', [memberId]);
    return result.rowCount > 0;
}

export async function branchBelongsToFamily(branchId, familyId) {
    if (branchId === null || branchId === undefined) return true;
    const result = await pool.query(
        'SELECT 1 FROM branch WHERE branch_id = $1 AND family_id = $2',
        [branchId, familyId],
    );
    return result.rowCount > 0;
}
