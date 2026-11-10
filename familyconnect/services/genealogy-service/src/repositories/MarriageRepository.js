import pool from '../config/database.js';

export async function listByFamily(familyId) {
    const result = await pool.query(
        `SELECT marriage.marriage_id, marriage.spouse_1_member_id, marriage.spouse_2_member_id,
                marriage.marriage_date::text AS marriage_date, marriage.status,
                marriage.created_at, marriage.updated_at
         FROM marriage
         JOIN member spouse_1 ON spouse_1.member_id = marriage.spouse_1_member_id
         JOIN member spouse_2 ON spouse_2.member_id = marriage.spouse_2_member_id
         WHERE spouse_1.family_id = $1 AND spouse_2.family_id = $1
         ORDER BY marriage.marriage_id`,
        [familyId],
    );
    return result.rows;
}

export async function listByFamilyMember(familyId, memberId) {
    const result = await pool.query(
        `SELECT marriage.marriage_id, marriage.spouse_1_member_id, marriage.spouse_2_member_id,
                marriage.marriage_date::text AS marriage_date, marriage.status,
                marriage.created_at, marriage.updated_at
         FROM marriage
         JOIN member spouse_1 ON spouse_1.member_id = marriage.spouse_1_member_id
         JOIN member spouse_2 ON spouse_2.member_id = marriage.spouse_2_member_id
         WHERE spouse_1.family_id = $1 AND spouse_2.family_id = $1
           AND (marriage.spouse_1_member_id = $2 OR marriage.spouse_2_member_id = $2)
         ORDER BY marriage.marriage_date NULLS LAST, marriage.marriage_id`,
        [familyId, memberId],
    );
    return result.rows;
}

export async function findById(marriageId) {
    const result = await pool.query(
        `SELECT marriage.marriage_id, marriage.spouse_1_member_id, marriage.spouse_2_member_id,
                marriage.marriage_date::text AS marriage_date, marriage.status,
                marriage.created_at, marriage.updated_at, spouse_1.family_id
         FROM marriage
         JOIN member spouse_1 ON spouse_1.member_id = marriage.spouse_1_member_id
         WHERE marriage.marriage_id = $1`,
        [marriageId],
    );
    return result.rows[0] ?? null;
}

export async function create({ spouse_1_member_id, spouse_2_member_id, marriage_date, status }) {
    const result = await pool.query(
        `INSERT INTO marriage (spouse_1_member_id, spouse_2_member_id, marriage_date, status)
         VALUES ($1, $2, $3, $4)
         RETURNING marriage_id, spouse_1_member_id, spouse_2_member_id,
                   marriage_date::text AS marriage_date, status, created_at, updated_at`,
        [spouse_1_member_id, spouse_2_member_id, marriage_date, status],
    );
    return result.rows[0];
}

export async function update(marriageId, changes) {
    const entries = Object.entries(changes).filter(([field]) => ['marriage_date', 'status'].includes(field));
    if (!entries.length) return findById(marriageId);
    const assignments = entries.map(([field], index) => `${field} = $${index + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(marriageId);
    const result = await pool.query(
        `UPDATE marriage
         SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE marriage_id = $${values.length}
         RETURNING marriage_id, spouse_1_member_id, spouse_2_member_id,
                   marriage_date::text AS marriage_date, status, created_at, updated_at`,
        values,
    );
    return result.rows[0] ?? null;
}

export async function remove(marriageId) {
    const result = await pool.query(
        'DELETE FROM marriage WHERE marriage_id = $1 RETURNING marriage_id',
        [marriageId],
    );
    return result.rowCount > 0;
}
