import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as PostService from '../services/PostService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    const { rows, total } = await PostService.list(req.user, req.query);
    res.set('X-Total-Count', String(total));
    return ApiResponse.ok(res, rows);
}

export async function get(req, res) {
    return ApiResponse.ok(res, await PostService.get(req.user, parseId(req.params.id)));
}

export async function create(req, res) {
    const post = await PostService.create(req.user, req.body);
    return ApiResponse.created(res, post, 'Post created');
}

export async function update(req, res) {
    const post = await PostService.update(req.user, parseId(req.params.id), req.body);
    return ApiResponse.ok(res, post, 'Post updated');
}

export async function remove(req, res) {
    await PostService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Post deleted', data: null });
}
