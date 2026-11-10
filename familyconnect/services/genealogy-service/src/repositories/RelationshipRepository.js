import pool from '../config/database.js';

export async function listByFamily(familyId, filters) {
    const values = [familyId];
    const conditions = [
        'parent.family_id = $1',
        'child.family_id = $1',
    ];
    if (filters.parent_member_id) {
        values.push(filters.parent_member_id);
        conditions.push(`r.parent_member_id = $${values.length}`);
    }
    if (filters.child_member_id) {
        values.push(filters.child_member_id);
        conditions.push(`r.child_member_id = $${values.length}`);
    }
    if (filters.member_id) {
        values.push(filters.member_id);
        conditions.push(`(r.parent_member_id = $${values.length} OR r.child_member_id = $${values.length})`);
    }
    const result = await pool.query(
        `SELECT r.*
         FROM parent_child_relationship r
         JOIN member parent ON parent.member_id = r.parent_member_id
         JOIN member child ON child.member_id = r.child_member_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY r.relationship_id`,
        values,
    );
    return result.rows;
}

export async function findById(relationshipId) {
    const result = await pool.query(
        `SELECT r.*, parent.family_id
         FROM parent_child_relationship r
         JOIN member parent ON parent.member_id = r.parent_member_id
         WHERE r.relationship_id = $1`,
        [relationshipId],
    );
    return result.rows[0] ?? null;
}

export async function create(parentMemberId, childMemberId, relationshipType) {
    const result = await pool.query(
        `WITH RECURSIVE descendants(member_id) AS (
             SELECT $2::BIGINT
             UNION
             SELECT relation.child_member_id
             FROM parent_child_relationship relation
             JOIN descendants descendant ON relation.parent_member_id = descendant.member_id
         )
         INSERT INTO parent_child_relationship (parent_member_id, child_member_id, relationship_type)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (SELECT 1 FROM descendants WHERE member_id = $1)
         RETURNING *`,
        [parentMemberId, childMemberId, relationshipType],
    );
    return result.rows[0] ?? null;
}

export async function update(relationshipId, relationshipType) {
    const result = await pool.query(
        `UPDATE parent_child_relationship
         SET relationship_type = $1, updated_at = NOW()
         WHERE relationship_id = $2
         RETURNING *`,
        [relationshipType, relationshipId],
    );
    return result.rows[0] ?? null;
}

export async function remove(relationshipId) {
    const result = await pool.query(
        'DELETE FROM parent_child_relationship WHERE relationship_id = $1 RETURNING relationship_id',
        [relationshipId],
    );
    return result.rowCount > 0;
}
