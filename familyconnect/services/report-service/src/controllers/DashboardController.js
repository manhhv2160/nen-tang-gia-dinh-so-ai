// Controller: nhận request, gọi service, trả ApiResponse
import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError, ErrorCodes } from '../../../../shared/src/AppError.js';
import { resolveFamily } from '../services/familyAccess.js';
import { StatsAggregator } from '../services/StatsAggregator.js';

export const DashboardController = {
  // GET /dashboard/stats?family_id=
  async stats(req, res) {
    const familyId = await resolveFamily(req);
    ApiResponse.ok(res, await StatsAggregator.stats({ familyId, user: req.user }));
  },

  // GET /dashboard/activity?family_id=&limit=
  async activity(req, res) {
    const familyId = await resolveFamily(req);
    if (!familyId) throw AppError.validation({ family_id: 'required' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const list = await StatsAggregator.activity({ familyId, limit, user: req.user });
    if (list === null) throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'Activity services are unavailable');
    ApiResponse.ok(res, list);
  },
};
