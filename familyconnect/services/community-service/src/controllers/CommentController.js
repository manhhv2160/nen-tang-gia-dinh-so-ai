import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as CommentService from '../services/CommentService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    const { rows, total } = await CommentService.list(req.user, req.query);
    res.set('X-Total-Count', String(total));
    return ApiResponse.ok(res, rows);
}

export async function create(req, res) {
    const comment = await CommentService.create(req.user, req.body);
    return ApiResponse.created(res, comment, 'Comment created');
}

export async function update(req, res) {
    const comment = await CommentService.update(req.user, parseId(req.params.id), req.body);
    return ApiResponse.ok(res, comment, 'Comment updated');
}

export async function remove(req, res) {
    await CommentService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Comment deleted', data: null });
}
