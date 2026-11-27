import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';
import { SemanticSearchService } from '../services/SemanticSearchService.js';

export const SearchController = {
 
  async search(req, res) {
    const { q, family_id: familyId } = req.query;
    if (typeof q !== 'string' || q.trim() === '') throw AppError.validation({ q: 'required' });
    if (q.length > 200) throw AppError.validation({ q: 'max 200 characters' });
    if (!/^\d+$/.test(familyId || '')) throw AppError.validation({ family_id: 'required' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    ApiResponse.ok(res, await SemanticSearchService.search({ user: req.user, q: q.trim(), familyId, limit }));
  },
};
