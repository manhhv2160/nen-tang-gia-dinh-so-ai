import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';
import { KnowledgeAssistantService } from '../services/KnowledgeAssistantService.js';

export const AssistantController = {
  // POST /ai/assistant  { family_id, question, history }
  async ask(req, res) {
    const { family_id: familyId, question, history = [] } = req.body || {};
    if (!/^\d+$/.test(String(familyId ?? ''))) throw AppError.validation({ family_id: 'required' });
    if (typeof question !== 'string' || question.trim() === '') throw AppError.validation({ question: 'required' });
    if (question.length > 1000) throw AppError.validation({ question: 'max 1000 characters' });
    if (!Array.isArray(history) || history.length > 10) throw AppError.validation({ history: 'max 10 turns' });
    if (!history.every((h) => ['user', 'assistant'].includes(h?.role) && typeof h?.content === 'string')) {
      throw AppError.validation({ history: 'items must be { role: user|assistant, content }' });
    }
    ApiResponse.ok(res, await KnowledgeAssistantService.ask({ user: req.user, familyId: String(familyId), question: question.trim(), history }));
  },
};
