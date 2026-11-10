import pool from '../config/database.js';

export async function listFamilyMembers(familyId) {
    const result = await pool.query(
        `SELECT member_id, full_name, gender, date_of_birth::text AS date_of_birth,
                date_of_death::text AS date_of_death,
                generation, branch_id, is_verified
         FROM member
         WHERE family_id = $1
         ORDER BY generation NULLS LAST, full_name, member_id`,
        [familyId],
    );
    return result.rows;
}

export async function listRelationships(familyId) {
    const result = await pool.query(
        `SELECT r.relationship_id, r.parent_member_id, r.child_member_id, r.relationship_type
         FROM parent_child_relationship r
         JOIN member parent ON parent.member_id = r.parent_member_id
         JOIN member child ON child.member_id = r.child_member_id
         WHERE parent.family_id = $1 AND child.family_id = $1
         ORDER BY r.relationship_id`,
        [familyId],
    );
    return result.rows;
}

export async function listMarriages(familyId) {
    const result = await pool.query(
        `SELECT m.marriage_id, m.spouse_1_member_id, m.spouse_2_member_id,
                m.marriage_date::text AS marriage_date, m.status
         FROM marriage m
         JOIN member spouse_1 ON spouse_1.member_id = m.spouse_1_member_id
         JOIN member spouse_2 ON spouse_2.member_id = m.spouse_2_member_id
         WHERE spouse_1.family_id = $1 AND spouse_2.family_id = $1
         ORDER BY m.marriage_id`,
        [familyId],
    );
    return result.rows;
}
