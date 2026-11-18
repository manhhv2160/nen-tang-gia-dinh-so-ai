import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as ReactionService from '../services/ReactionService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    return ApiResponse.ok(res, await ReactionService.list(req.user, req.query));
}

export async function setReaction(req, res) {
    const { reaction, created } = await ReactionService.setReaction(req.user, req.body);
    return created
        ? ApiResponse.created(res, reaction, 'Reaction created')
        : ApiResponse.ok(res, reaction, 'Reaction updated');
}

export async function remove(req, res) {
    await ReactionService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Reaction deleted', data: null });
}
