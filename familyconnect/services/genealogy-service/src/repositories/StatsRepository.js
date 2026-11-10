import pool from '../config/database.js';

export async function getStats(familyId = null) {
    const result = await pool.query(
        `SELECT
            (SELECT COUNT(*)::int
             FROM family
             WHERE $1::BIGINT IS NULL OR family_id = $1) AS families_count,
            (SELECT COUNT(*)::int
             FROM branch
             WHERE $1::BIGINT IS NULL OR family_id = $1) AS branches_count,
            (SELECT COUNT(*)::int
             FROM member
             WHERE $1::BIGINT IS NULL OR family_id = $1) AS members_count,
            (SELECT COUNT(*)::int
             FROM member
             WHERE is_verified = TRUE
               AND ($1::BIGINT IS NULL OR family_id = $1)) AS verified_members_count,
            jsonb_build_object(
                'MALE', (SELECT COUNT(*)::int FROM member WHERE gender = 'MALE' AND ($1::BIGINT IS NULL OR family_id = $1)),
                'FEMALE', (SELECT COUNT(*)::int FROM member WHERE gender = 'FEMALE' AND ($1::BIGINT IS NULL OR family_id = $1)),
                'OTHER', (SELECT COUNT(*)::int FROM member WHERE gender = 'OTHER' AND ($1::BIGINT IS NULL OR family_id = $1))
            ) AS members_by_gender,
            COALESCE(
                (SELECT jsonb_object_agg(generation::text, generation_count)
                 FROM (
                     SELECT generation, COUNT(*)::int AS generation_count
                     FROM member
                     WHERE generation IS NOT NULL
                       AND ($1::BIGINT IS NULL OR family_id = $1)
                     GROUP BY generation
                 ) grouped_generations),
                '{}'::jsonb
            ) AS members_by_generation`,
        [familyId],
    );
    return result.rows[0];
}
