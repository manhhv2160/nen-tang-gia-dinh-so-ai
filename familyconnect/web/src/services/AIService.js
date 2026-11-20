// Tích hợp trợ lý AI và LLM (ai-service)
import { ApiClient } from './ApiClient.js';

export class AIService extends ApiClient {
  /** Tìm thành viên và tư liệu di sản theo từ khóa. Trả { query, mode, members, heritages }. */
  search(q, familyId, limit = 10) {
    return this.get('/ai/search', { query: { q, family_id: familyId, limit } });
  }

  /** Giải thích quan hệ: to_member là gì của from_member. Trả { relation, explanation, path }. */
  explainRelationship(fromMemberId, toMemberId) {
    return this.post('/ai/explain-relationship', { from_member_id: fromMemberId, to_member_id: toMemberId });
  }

  /** Hỏi đáp về gia phả. history */
  ask(familyId, question, history = []) {
    return this.post('/ai/assistant', { family_id: familyId, question, history });
  }

  summarize(text) {
    return this.post('/ai/summarize', { text });
  }

  recommendations(memberId, limit = 5) {
    return this.get('/ai/recommendations', { query: { member_id: memberId, limit } });
  }
}
