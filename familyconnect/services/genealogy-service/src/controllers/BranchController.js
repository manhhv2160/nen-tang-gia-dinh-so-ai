import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as BranchService from '../services/BranchService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    const { rows, total } = await BranchService.list(req.user, req.query);
    res.set('X-Total-Count', String(total));
    return ApiResponse.ok(res, rows);
}

export async function get(req, res) {
    return ApiResponse.ok(res, await BranchService.get(req.user, parseId(req.params.id)));
}

export async function create(req, res) {
    return ApiResponse.created(res, await BranchService.create(req.user, req.body), 'Branch created');
}

export async function update(req, res) {
    const branch = await BranchService.update(req.user, parseId(req.params.id), req.body);
    return ApiResponse.ok(res, branch, 'Branch updated');
}

export async function remove(req, res) {
    await BranchService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Branch deleted', data: null });
}
