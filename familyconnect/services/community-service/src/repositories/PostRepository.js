import pool from '../config/database.js';

export async function listByFamily(familyId, { limit, offset, sortDirection, postType, userId }) {
    const conditions = ['family_id = $1'];
    const values = [familyId];
    if (postType) {
        values.push(postType);
        conditions.push(`post_type = $${values.length}`);
    }
    if (userId) {
        values.push(userId);
        conditions.push(`user_id = $${values.length}`);
    }
    const where = conditions.join(' AND ');

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM post WHERE ${where}`, values);
    const result = await pool.query(
        `SELECT * FROM post WHERE ${where}
         ORDER BY created_at ${sortDirection}, post_id ${sortDirection}
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset],
    );
    return { rows: result.rows, total: countResult.rows[0].total };
}

export async function findById(postId) {
    const result = await pool.query('SELECT * FROM post WHERE post_id = $1', [postId]);
    return result.rows[0] ?? null;
}

export async function create({ family_id, user_id, post_type, title, content }) {
    const result = await pool.query(
        `INSERT INTO post (family_id, user_id, post_type, title, content)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [family_id, user_id, post_type, title, content],
    );
    return result.rows[0];
}

export async function update(postId, changes) {
    const entries = Object.entries(changes)
        .filter(([key]) => ['title', 'content', 'post_type'].includes(key));
    if (!entries.length) return findById(postId);

    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(postId);
    const result = await pool.query(
        `UPDATE post SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE post_id = $${values.length} RETURNING *`,
        values,
    );
    return result.rows[0] ?? null;
}

/** Xóa bài; bình luận và cảm xúc của bài bị xóa theo (ON DELETE CASCADE). */
export async function remove(postId) {
    const result = await pool.query('DELETE FROM post WHERE post_id = $1 RETURNING post_id', [postId]);
    return result.rowCount > 0;
}
