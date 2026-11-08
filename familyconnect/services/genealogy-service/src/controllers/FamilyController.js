import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as FamilyService from '../services/FamilyService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    const { rows, total } = await FamilyService.list(req.user, req.query);
    res.set('X-Total-Count', String(total));
    return ApiResponse.ok(res, rows);
}

export async function get(req, res) {
    return ApiResponse.ok(res, await FamilyService.get(req.user, parseId(req.params.id)));
}

export async function create(req, res) {
    return ApiResponse.created(res, await FamilyService.create(req.user, req.body), 'Family created');
}

export async function update(req, res) {
    const family = await FamilyService.update(req.user, parseId(req.params.id), req.body);
    return ApiResponse.ok(res, family, 'Family updated');
}

export async function remove(req, res) {
    await FamilyService.remove(parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Family deleted', data: null });
}
