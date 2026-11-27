// Tóm tắt: có mô hình ngôn ngữ thì dùng mô hình, không có (hoặc lỗi) thì tóm tắt bằng cách chọn câu quan trọng
import { tokenize } from '../../../../shared/src/text.js';
import { LlmProvider } from '../providers/LlmProvider.js';

const STOP = new Set('la va cua o trong cho cac nhung mot co khong duoc de den tu voi da se nay do thi ma cung rat'.split(' '));

export function extractiveSummary(text, maxSentences = 3) {
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  const freq = new Map();
  for (const s of sentences) for (const t of tokenize(s)) if (!STOP.has(t) && t.length > 1) freq.set(t, (freq.get(t) ?? 0) + 1);
  const scored = sentences.map((s, index) => {
    const tokens = tokenize(s).filter((t) => !STOP.has(t) && t.length > 1);
    const score = tokens.reduce((a, t) => a + (freq.get(t) ?? 0), 0) / Math.sqrt(tokens.length || 1);
    return { s, index, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, maxSentences)
    .sort((a, b) => a.index - b.index).map((x) => x.s).join(' ');
}

export const SummarizationService = {
  async summarize({ text }) {
    if (LlmProvider.isEnabled()) {
      try {
        const summary = await LlmProvider.complete({
          system: 'Tóm tắt văn bản sau bằng tiếng Việt, tối đa 3 câu, giữ đúng tên người và năm tháng, không thêm thông tin.',
          messages: [{ role: 'user', content: text }],
          maxTokens: 400,
        });
        return { summary };
      } catch (err) {
        console.error('[ai-service] LLM tóm tắt lỗi, dùng tóm tắt trích câu:', err.message);
      }
    }
    return { summary: extractiveSummary(text) };
  },
};
