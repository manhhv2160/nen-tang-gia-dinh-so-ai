import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import * as StatsService from '../services/StatsService.js';

/** GET /internal/stats — cho report-service (dashboard). */
export async function stats(req, res) {
    return ApiResponse.ok(res, await StatsService.getStats(req.query));
}

/** GET /internal/activity — hoạt động gần đây của dòng họ (dashboard/activity). */
export async function activity(req, res) {
    return ApiResponse.ok(res, await StatsService.getActivity(req.query));
}