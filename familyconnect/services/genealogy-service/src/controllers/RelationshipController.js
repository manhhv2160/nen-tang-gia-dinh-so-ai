import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as RelationshipQueryService from '../services/RelationshipQueryService.js';
import * as RelationshipService from '../services/RelationshipService.js';
import { parseId } from '../utils/validation.js';

export async function list(req, res) {
    return ApiResponse.ok(res, await RelationshipService.list(req.user, req.query));
}

export async function create(req, res) {
    return ApiResponse.created(
        res,
        await RelationshipService.create(req.user, req.body),
        'Relationship created',
    );
}

export async function update(req, res) {
    return ApiResponse.ok(
        res,
        await RelationshipService.update(req.user, parseId(req.params.id), req.body),
        'Relationship updated',
    );
}

export async function remove(req, res) {
    await RelationshipService.remove(req.user, parseId(req.params.id));
    return res.status(200).json({ success: true, status_code: 200, message: 'Relationship deleted', data: null });
}

export async function query(req, res) {
    const data = await RelationshipQueryService.query(
        req.query.from_member_id,
        req.query.to_member_id,
        req.user,
    );
    return ApiResponse.ok(res, data);
}
