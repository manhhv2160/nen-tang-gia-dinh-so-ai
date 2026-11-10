import { MarriageStatus, Roles } from '../../../../shared/src/enums.js';
import * as MarriageRepository from '../repositories/MarriageRepository.js';
import * as MemberRepository from '../repositories/MemberRepository.js';
import { assertFamilyAccess } from './access.js';
import { notFound } from '../utils/errors.js';
import { failValidation, parseDate, parseId } from '../utils/validation.js';

function parseStatus(value, creating = false) {
    const status = value === undefined && creating ? MarriageStatus.MARRIED : value;
    if (!Object.values(MarriageStatus).includes(status)) {
        failValidation({ status: 'must be one of MARRIED, DIVORCED, WIDOWED' });
    }
    return status;
}

async function findSpouses(spouse1Id, spouse2Id) {
    if (spouse1Id === spouse2Id) failValidation({ spouse_2_member_id: 'must differ from spouse_1_member_id' });
    const [spouse1, spouse2] = await Promise.all([
        MemberRepository.findById(spouse1Id),
        MemberRepository.findById(spouse2Id),
    ]);
    if (!spouse1 || !spouse2) throw notFound('Member not found');
    if (spouse1.family_id !== spouse2.family_id) {
        failValidation({ spouse_2_member_id: 'both spouses must belong to the same family' });
    }
    return { familyId: spouse1.family_id };
}

export async function list(user, query) {
    const memberId = parseId(query.member_id, 'member_id');
    const member = await MemberRepository.findById(memberId);
    if (!member) throw notFound('Member not found');
    await assertFamilyAccess(user, member.family_id, Roles.FAMILY_MEMBER);
    return MarriageRepository.listByFamilyMember(member.family_id, memberId);
}

export async function create(user, body) {
    const spouse1Id = parseId(body?.spouse_1_member_id, 'spouse_1_member_id');
    const spouse2Id = parseId(body?.spouse_2_member_id, 'spouse_2_member_id');
    const marriageDate = parseDate(body?.marriage_date, 'marriage_date') ?? null;
    const status = parseStatus(body?.status, true);
    const { familyId } = await findSpouses(spouse1Id, spouse2Id);
    await assertFamilyAccess(user, familyId, Roles.FAMILY_ADMIN);
    return MarriageRepository.create({
        spouse_1_member_id: spouse1Id,
        spouse_2_member_id: spouse2Id,
        marriage_date: marriageDate,
        status,
    });
}

export async function update(user, marriageId, body) {
    const marriage = await MarriageRepository.findById(marriageId);
    if (!marriage) throw notFound('Marriage not found');
    await assertFamilyAccess(user, marriage.family_id, Roles.FAMILY_ADMIN);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const changes = {};
    if (Object.hasOwn(body, 'marriage_date')) changes.marriage_date = parseDate(body.marriage_date, 'marriage_date');
    if (Object.hasOwn(body, 'status')) changes.status = parseStatus(body.status);
    if (!Object.keys(changes).length) failValidation({ body: 'must include marriage_date or status' });
    return MarriageRepository.update(marriageId, changes);
}

export async function remove(user, marriageId) {
    const marriage = await MarriageRepository.findById(marriageId);
    if (!marriage) throw notFound('Marriage not found');
    await assertFamilyAccess(user, marriage.family_id, Roles.FAMILY_ADMIN);
    await MarriageRepository.remove(marriageId);
}
