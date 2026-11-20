import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';
import { RelationshipExplainService } from '../services/RelationshipExplainService.js';

export const RelationshipExplainController = {
  async explain(req, res) {
    const { from_member_id: from, to_member_id: to } = req.body || {};
    if (!/^\d+$/.test(String(from ?? '')) || !/^\d+$/.test(String(to ?? ''))) {
      throw AppError.validation({ from_member_id: 'required', to_member_id: 'required' });
    }
    ApiResponse.ok(res, await RelationshipExplainService.explain({ user: req.user, fromMemberId: String(from), toMemberId: String(to) }));
  },
};
