import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as MemberRepository from '../repositories/MemberRepository.js';
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
