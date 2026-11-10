import { Roles } from '../../../../shared/src/enums.js';
import * as BranchRepository from '../repositories/BranchRepository.js';
import * as FamilyRepository from '../repositories/FamilyRepository.js';
import * as TreeRepository from '../repositories/TreeRepository.js';
import { assertFamilyAccess } from './access.js';
import { notFound } from '../utils/errors.js';
import { failValidation, parseId } from '../utils/validation.js';

function parseDepth(value) {
    if (value === undefined || value === '') return undefined;
    const depth = Number(value);
    if (!Number.isInteger(depth) || depth < 1 || depth > 10) {
        failValidation({ depth: 'must be an integer between 1 and 10' });
    }
    return depth;
}

export async function get(user, query) {
    const familyId = parseId(query.family_id, 'family_id');
    const branchId = query.branch_id === undefined ? undefined : parseId(query.branch_id, 'branch_id');
    const rootMemberId = query.root_member_id === undefined
        ? undefined
        : parseId(query.root_member_id, 'root_member_id');
    const depth = parseDepth(query.depth);
    if (depth !== undefined && rootMemberId === undefined) {
        failValidation({ root_member_id: 'is required when depth is provided' });
    }
    await assertFamilyAccess(user, familyId, Roles.FAMILY_MEMBER);
    if (!(await FamilyRepository.findById(familyId))) throw notFound('Family not found');

    const [familyMembers, relationships, marriages] = await Promise.all([
        TreeRepository.listFamilyMembers(familyId),
        TreeRepository.listRelationships(familyId),
        TreeRepository.listMarriages(familyId),
    ]);
    let members = familyMembers;

    if (branchId !== undefined) {
        const branch = await BranchRepository.findById(branchId);
        if (!branch || branch.family_id !== familyId) {
            throw notFound('Branch not found in family');
        }
        members = members.filter((member) => member.branch_id === branchId);
    }

    if (rootMemberId !== undefined) {
        if (!members.some((member) => member.member_id === rootMemberId)) {
            throw notFound('Root member not found in family or branch');
        }
        const included = new Set([rootMemberId]);
        let currentLevel = [rootMemberId];
        let level = 0;
        const maxDepth = depth ?? Number.POSITIVE_INFINITY;
        while (currentLevel.length && level < maxDepth) {
            const nextLevel = [];
            for (const relationship of relationships) {
                if (currentLevel.includes(relationship.parent_member_id)
                    && !included.has(relationship.child_member_id)) {
                    included.add(relationship.child_member_id);
                    nextLevel.push(relationship.child_member_id);
                }
            }
            currentLevel = nextLevel;
            level += 1;
        }
        members = members.filter((member) => included.has(member.member_id));
    }

    const memberIds = new Set(members.map((member) => member.member_id));
    const edges = [
        ...relationships
            .filter((edge) => memberIds.has(edge.parent_member_id) && memberIds.has(edge.child_member_id))
            .map((edge) => ({ type: 'PARENT_CHILD', ...edge })),
        ...marriages
            .filter((edge) => memberIds.has(edge.spouse_1_member_id) && memberIds.has(edge.spouse_2_member_id))
            .map((edge) => ({ type: 'MARRIAGE', ...edge })),
    ];

    return { family_id: familyId, nodes: members, edges };
}
