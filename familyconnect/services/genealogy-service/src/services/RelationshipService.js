import { RelationshipTypes, Roles } from '../../../../shared/src/enums.js';
import * as FamilyRepository from '../repositories/FamilyRepository.js';
import * as MemberRepository from '../repositories/MemberRepository.js';
import * as RelationshipRepository from '../repositories/RelationshipRepository.js';
import { assertFamilyAccess } from './access.js';
import { conflict, notFound } from '../utils/errors.js';
import { failValidation, parseId } from '../utils/validation.js';

function parseType(value, creating = false) {
    const type = value === undefined && creating ? RelationshipTypes.BIOLOGICAL : value;
    if (!Object.values(RelationshipTypes).includes(type)) {
        failValidation({ relationship_type: 'must be one of BIOLOGICAL, ADOPTED' });
    }
    return type;
}

async function findMembersInFamily(memberIds) {
    const members = await Promise.all(memberIds.map((id) => MemberRepository.findById(id)));
    if (members.some((member) => !member)) throw notFound('Member not found');
    const familyId = members[0].family_id;
    if (members.some((member) => member.family_id !== familyId)) {
        failValidation({ member_id: 'all members must belong to the same family' });
    }
    return { familyId, members };
}

export async function list(user, query) {
    const filters = {};
    for (const field of ['parent_member_id', 'child_member_id', 'member_id']) {
        if (query[field] !== undefined) filters[field] = parseId(query[field], field);
    }
    if (!Object.keys(filters).length) {
        failValidation({ member_id: 'provide parent_member_id, child_member_id or member_id' });
    }
    const { familyId } = await findMembersInFamily(Object.values(filters));
    if (!(await FamilyRepository.findById(familyId))) throw notFound('Family not found');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_MEMBER);
    return RelationshipRepository.listByFamily(familyId, filters);
}

export async function create(user, body) {
    const parentMemberId = parseId(body?.parent_member_id, 'parent_member_id');
    const childMemberId = parseId(body?.child_member_id, 'child_member_id');
    if (parentMemberId === childMemberId) {
        failValidation({ child_member_id: 'must differ from parent_member_id' });
    }
    const relationshipType = parseType(body?.relationship_type, true);
    const { familyId } = await findMembersInFamily([parentMemberId, childMemberId]);
    await assertFamilyAccess(user, familyId, Roles.FAMILY_ADMIN);
    try {
        const relationship = await RelationshipRepository.create(parentMemberId, childMemberId, relationshipType);
        if (!relationship) {
            failValidation({ child_member_id: 'relationship would create an ancestor cycle' });
        }
        return relationship;
    } catch (error) {
        if (error.code === '23505') throw conflict('Parent-child relationship already exists');
        throw error;
    }
}

export async function update(user, relationshipId, body) {
    const relationship = await RelationshipRepository.findById(relationshipId);
    if (!relationship) throw notFound('Relationship not found');
    await assertFamilyAccess(user, relationship.family_id, Roles.FAMILY_ADMIN);
    const type = parseType(body?.relationship_type);
    return RelationshipRepository.update(relationshipId, type);
}

export async function remove(user, relationshipId) {
    const relationship = await RelationshipRepository.findById(relationshipId);
    if (!relationship) throw notFound('Relationship not found');
    await assertFamilyAccess(user, relationship.family_id, Roles.FAMILY_ADMIN);
    await RelationshipRepository.remove(relationshipId);
}
