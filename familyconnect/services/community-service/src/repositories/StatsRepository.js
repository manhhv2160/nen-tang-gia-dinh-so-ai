// Truy vấn số liệu cho report-service (GET /internal/stats) và hoạt động gần đây (GET /internal/activity).
// family_id = null nghĩa là thống kê toàn hệ thống; có family_id thì chỉ tính trong dòng họ đó.
import pool from '../config/database.js';

export async function getStats(familyId = null) {
    const result = await pool.query(
        `SELECT
            (SELECT COUNT(*)::int
             FROM post
             WHERE $1::BIGINT IS NULL OR family_id = $1) AS posts_count,
            (SELECT COUNT(*)::int
             FROM comment c
             JOIN post p ON p.post_id = c.post_id
             WHERE $1::BIGINT IS NULL OR p.family_id = $1) AS comments_count,
            (SELECT COUNT(*)::int
             FROM reaction r
             JOIN post p ON p.post_id = r.post_id
             WHERE $1::BIGINT IS NULL OR p.family_id = $1) AS reactions_count,
            jsonb_build_object(
                'NEWS', (SELECT COUNT(*)::int FROM post
                         WHERE post_type = 'NEWS' AND ($1::BIGINT IS NULL OR family_id = $1)),
                'ANNOUNCEMENT', (SELECT COUNT(*)::int FROM post
                                 WHERE post_type = 'ANNOUNCEMENT' AND ($1::BIGINT IS NULL OR family_id = $1)),
                'GENERAL', (SELECT COUNT(*)::int FROM post
                            WHERE post_type = 'GENERAL' AND ($1::BIGINT IS NULL OR family_id = $1))
            ) AS posts_by_type`,
        [familyId],
    );
    return result.rows[0];
}

/** Hoạt động cộng đồng gần đây: bài đăng và bình luận, mới nhất trước. */
export async function listActivity(familyId, limit) {
    const result = await pool.query(
        `SELECT *
         FROM (
             SELECT 'POST_CREATED'::text AS activity_type,
                    user_id,
                    post_id AS entity_id,
                    family_id,
                    created_at
             FROM post
             WHERE family_id = $1
             UNION ALL
             SELECT 'COMMENT_CREATED'::text,
                    c.user_id,
                    c.comment_id,
                    p.family_id,
                    c.created_at
             FROM comment c
             JOIN post p ON p.post_id = c.post_id
             WHERE p.family_id = $1
         ) activity
         ORDER BY created_at DESC, entity_id DESC
         LIMIT $2`,
        [familyId, limit],
    );
    return result.rows;
}