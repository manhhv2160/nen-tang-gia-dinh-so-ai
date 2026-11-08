import pool from '../config/database.js';

export async function hasFamilyMembership(userId, familyId) {
    const result = await pool.query(
        'SELECT 1 FROM member WHERE user_id = $1 AND family_id = $2 LIMIT 1',
        [userId, familyId],
    );
    return result.rowCount > 0;
}
