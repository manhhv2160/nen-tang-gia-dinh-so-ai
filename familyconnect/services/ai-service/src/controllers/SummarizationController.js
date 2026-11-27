import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';
import { SummarizationService } from '../services/SummarizationService.js';

export const SummarizationController = {
  async summarize(req, res) {
    const { text } = req.body || {};
    if (typeof text !== 'string' || text.trim() === '') throw AppError.validation({ text: 'required' });
    if (text.length > 20000) throw AppError.validation({ text: 'max 20000 characters' });
    ApiResponse.ok(res, await SummarizationService.summarize({ text }));
  },
};
