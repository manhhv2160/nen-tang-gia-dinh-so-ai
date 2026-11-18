import pool from '../config/database.js';

export async function listByPost(postId, { limit, offset }) {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM comment WHERE post_id = $1', [postId]);
    const result = await pool.query(
        `SELECT * FROM comment WHERE post_id = $1
         ORDER BY created_at ASC, comment_id ASC
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset],
    );
    return { rows: result.rows, total: countResult.rows[0].total };
}

export async function findById(commentId) {
    const result = await pool.query('SELECT * FROM comment WHERE comment_id = $1', [commentId]);
    return result.rows[0] ?? null;
}

export async function create({ post_id, user_id, content }) {
    const result = await pool.query(
        `INSERT INTO comment (post_id, user_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [post_id, user_id, content],
    );
    return result.rows[0];
}

export async function update(commentId, content) {
    const result = await pool.query(
        `UPDATE comment SET content = $1, updated_at = NOW()
         WHERE comment_id = $2 RETURNING *`,
        [content, commentId],
    );
    return result.rows[0] ?? null;
}

export async function remove(commentId) {
    const result = await pool.query('DELETE FROM comment WHERE comment_id = $1 RETURNING comment_id', [commentId]);
    return result.rowCount > 0;
}
