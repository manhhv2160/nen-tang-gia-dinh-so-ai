import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';
import { RecommendationService } from '../services/RecommendationService.js';

export const RecommendationController = {
 
  async list(req, res) {
    const memberId = req.query.member_id;
    if (!/^\d+$/.test(memberId || '')) throw AppError.validation({ member_id: 'required' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 10);
    ApiResponse.ok(res, await RecommendationService.recommend({ user: req.user, memberId, limit }));
  },
};
