import * as MemberRepository from '../repositories/MemberRepository.js';
import * as TreeRepository from '../repositories/TreeRepository.js';
import { Roles } from '../../../../shared/src/enums.js';
import { assertFamilyAccess } from './access.js';
import { notFound } from '../utils/errors.js';
import { parseId } from '../utils/validation.js';

function classify(path) {
    const steps = path.map((entry) => entry.step);
    const signature = steps.join(',');
    const relations = new Map([
        ['', 'SELF'],
        ['SPOUSE', 'SPOUSE'],
        ['PARENT', 'PARENT'],
        ['CHILD', 'CHILD'],
        ['PARENT,CHILD', 'SIBLING'],
        ['PARENT,PARENT', 'GRANDPARENT'],
        ['CHILD,CHILD', 'GRANDCHILD'],
        ['PARENT,PARENT,CHILD', 'NIECE_NEPHEW'],
        ['PARENT,CHILD,CHILD', 'UNCLE_AUNT'],
        ['PARENT,PARENT,CHILD,CHILD', 'COUSIN'],
    ]);
    return relations.get(signature) ?? 'OTHER';
}

function findPath(fromMemberId, toMemberId, relationships, marriages) {
    const graph = new Map();
    const connect = (from, to, step) => {
        if (!graph.has(from)) graph.set(from, []);
        graph.get(from).push({ member_id: to, step });
    };
    for (const relationship of relationships) {
        connect(relationship.parent_member_id, relationship.child_member_id, 'CHILD');
        connect(relationship.child_member_id, relationship.parent_member_id, 'PARENT');
    }
    for (const marriage of marriages) {
        connect(marriage.spouse_1_member_id, marriage.spouse_2_member_id, 'SPOUSE');
        connect(marriage.spouse_2_member_id, marriage.spouse_1_member_id, 'SPOUSE');
    }
    for (const adjacent of graph.values()) {
        adjacent.sort((left, right) => left.member_id.localeCompare(right.member_id));
    }

    const queue = [{ member_id: fromMemberId, path: [] }];
    const visited = new Set([fromMemberId]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        if (current.member_id === toMemberId) return current.path;
        for (const adjacent of graph.get(current.member_id) ?? []) {
            if (visited.has(adjacent.member_id)) continue;
            visited.add(adjacent.member_id);
            queue.push({
                member_id: adjacent.member_id,
                path: [...current.path, adjacent],
            });
        }
    }
    return [];
}

export async function query(fromValue, toValue, user) {
    const fromMemberId = parseId(fromValue, 'from_member_id');
    const toMemberId = parseId(toValue, 'to_member_id');
    const [fromMember, toMember] = await Promise.all([
        MemberRepository.findById(fromMemberId),
        MemberRepository.findById(toMemberId),
    ]);
    if (!fromMember || !toMember) throw notFound('Member not found');
    if (fromMember.family_id !== toMember.family_id) throw notFound('Members are not in the same family');
    if (user) await assertFamilyAccess(user, fromMember.family_id, Roles.FAMILY_MEMBER);
    const [relationships, marriages] = await Promise.all([
        TreeRepository.listRelationships(fromMember.family_id),
        TreeRepository.listMarriages(fromMember.family_id),
    ]);
    const path = findPath(fromMemberId, toMemberId, relationships, marriages);
    return {
        from_member_id: fromMemberId,
        to_member_id: toMemberId,
        relation: path.length || fromMemberId === toMemberId ? classify(path) : 'NONE',
        path,
    };
}
