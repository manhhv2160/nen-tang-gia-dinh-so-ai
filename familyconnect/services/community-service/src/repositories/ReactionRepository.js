import pool from '../config/database.js';

export async function listByPost(postId) {
    const result = await pool.query(
        `SELECT * FROM reaction WHERE post_id = $1
         ORDER BY created_at ASC, reaction_id ASC`,
        [postId],
    );
    return result.rows;
}

export async function findByPostAndUser(postId, userId) {
    const result = await pool.query(
        'SELECT * FROM reaction WHERE post_id = $1 AND user_id = $2',
        [postId, userId],
    );
    return result.rows[0] ?? null;
}

export async function findById(reactionId) {
    const result = await pool.query('SELECT * FROM reaction WHERE reaction_id = $1', [reactionId]);
    return result.rows[0] ?? null;
}

export async function create({ post_id, user_id, reaction_type }) {
    const result = await pool.query(
        `INSERT INTO reaction (post_id, user_id, reaction_type)
         VALUES ($1, $2, $3) RETURNING *`,
        [post_id, user_id, reaction_type],
    );
    return result.rows[0];
}

export async function update(reactionId, reactionType) {
    const result = await pool.query(
        `UPDATE reaction SET reaction_type = $1, updated_at = NOW()
         WHERE reaction_id = $2 RETURNING *`,
        [reactionType, reactionId],
    );
    return result.rows[0] ?? null;
}

export async function remove(reactionId) {
    const result = await pool.query('DELETE FROM reaction WHERE reaction_id = $1 RETURNING reaction_id', [reactionId]);
    return result.rowCount > 0;
}

/** Số lượng cảm xúc theo loại: { LIKE: 3, LOVE: 1, ... } (dùng cho /internal/stats - thẻ FMLCN-47). */
export async function countByType(familyId) {
    const values = [];
    let where = '';
    if (familyId) {
        values.push(familyId);
        where = 'WHERE p.family_id = $1';
    }
    const result = await pool.query(
        `SELECT r.reaction_type, COUNT(*)::int AS count
         FROM reaction r JOIN post p ON p.post_id = r.post_id
         ${where}
         GROUP BY r.reaction_type`,
        values,
    );
    return Object.fromEntries(result.rows.map((row) => [row.reaction_type, row.count]));
}
