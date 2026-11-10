import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as MarriageService from '../services/MarriageService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    return ApiResponse.ok(res, await MarriageService.list(req.user, req.query));
}

export async function create(req, res) {
    return ApiResponse.created(res, await MarriageService.create(req.user, req.body), 'Marriage created');
}

export async function update(req, res) {
    return ApiResponse.ok(
        res,
        await MarriageService.update(req.user, parseId(req.params.id), req.body),
        'Marriage updated',
    );
}

export async function remove(req, res) {
    await MarriageService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Marriage deleted', data: null });
}
