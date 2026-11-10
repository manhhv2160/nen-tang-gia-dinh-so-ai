import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as MemberRepository from '../repositories/MemberRepository.js';
import * as StatsRepository from '../repositories/StatsRepository.js';
import * as RelationshipQueryService from '../services/RelationshipQueryService.js';
import { notFound } from '../utils/errors.js';
import { parseId } from '../utils/validation.js';

export async function memberships(req, res) {
    const userId = parseId(req.query.user_id, 'user_id');
    const memberships = await MemberRepository.listMembershipsByUserId(userId);
    return ApiResponse.ok(res, { user_id: userId, memberships });
}

export async function getMember(req, res) {
    const memberId = parseId(req.params.id, 'id');
    const member = await MemberRepository.findById(memberId);
    if (!member) throw notFound('Member not found');
    return ApiResponse.ok(res, member);
}

export async function relationQuery(req, res) {
    const data = await RelationshipQueryService.query(
        req.query.from_member_id,
        req.query.to_member_id,
    );
    return ApiResponse.ok(res, data);
}

export async function stats(req, res) {
    const familyId = req.query.family_id === undefined
        ? null
        : parseId(req.query.family_id, 'family_id');
    const data = await StatsRepository.getStats(familyId);
    return ApiResponse.ok(res, data);
}
