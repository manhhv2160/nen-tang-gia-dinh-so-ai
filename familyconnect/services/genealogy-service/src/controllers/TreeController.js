import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as TreeService from '../services/TreeService.js';

export async function get(req, res) {
    return ApiResponse.ok(res, await TreeService.get(req.user, req.query));
}
