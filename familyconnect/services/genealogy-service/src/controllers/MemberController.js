import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as MemberService from '../services/MemberService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    const { rows, total } = await MemberService.list(req.user, req.query);
    res.set('X-Total-Count', String(total));
    return ApiResponse.ok(res, rows);
}

export async function get(req, res) {
    return ApiResponse.ok(res, await MemberService.get(req.user, parseId(req.params.id)));
}

export async function create(req, res) {
    return ApiResponse.created(res, await MemberService.create(req.user, req.body), 'Member created');
}

export async function update(req, res) {
    const member = await MemberService.update(req.user, parseId(req.params.id), req.body);
    return ApiResponse.ok(res, member, 'Member updated');
}

export async function remove(req, res) {
    await MemberService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Member deleted', data: null });
}
