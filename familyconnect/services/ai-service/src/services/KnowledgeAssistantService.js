// Trợ lý hỏi đáp: tìm thông tin liên quan trong gia phả rồi nhờ mô hình ngôn ngữ trả lời dựa trên đó
import { AppError, ErrorCodes } from '../../../../shared/src/AppError.js';
import { tokenize } from '../../../../shared/src/text.js';
import { GenealogyClient } from '../clients/GenealogyClient.js';
import { HeritageClient } from '../clients/HeritageClient.js';
import { LlmProvider } from '../providers/LlmProvider.js';
import { assertFamilyAccess } from '../utils/access.js';

const STOP = new Set('la va cua o trong cho cac nhung mot co khong duoc de den tu voi da se nay do thi ma cung rat ai gi nao the nhu bao nhieu sao khi nao toi ban minh cho biet hay ve'.split(' '));

function keywords(question) {
  const out = [];
  for (const raw of question.split(/[\s,.?!;:]+/)) {
    const [t] = tokenize(raw);
    if (t && t.length > 1 && !STOP.has(t) && !out.some((k) => tokenize(k)[0] === t)) out.push(raw);
  }
  return out.slice(0, 5);
}

export const KnowledgeAssistantService = {
  keywords,

  async ask({ user, familyId, question, history }) {
    if (!LlmProvider.isEnabled()) throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'AI assistant is not enabled');
    await assertFamilyAccess(user, familyId);

    const members = new Map();
    const heritages = new Map();
    const results = await Promise.allSettled(keywords(question).flatMap((k) => [
      GenealogyClient.searchMembers(k, [familyId], 5, user).then((r) => r.forEach((m) => members.set(m.member_id, m))),
      HeritageClient.search(k, [familyId], 5, user).then((r) => r.forEach((h) => heritages.set(h.heritage_id, h))),
    ]));
    if (results.length && results.every((r) => r.status === 'rejected')) throw AppError.serviceUnavailable();

    const memberList = [...members.values()].slice(0, 8);
    const heritageList = [...heritages.values()].slice(0, 8);
    const context = [
      ...memberList.map((m) => `- Thành viên: ${m.full_name}${m.generation ? ` (thế hệ ${m.generation})` : ''}`),
      ...heritageList.map((h) => `- Tư liệu (${h.heritage_type}): ${h.title}`),
    ].join('\n') || '(Không tìm thấy thông tin liên quan trong gia phả)';

    const answer = await LlmProvider.complete({
      system: 'Bạn là trợ lý gia phả của dòng họ. Chỉ trả lời dựa trên thông tin được cung cấp, bằng tiếng Việt, ngắn gọn. '
        + 'Nếu thông tin không đủ, hãy nói rõ là chưa có trong gia phả, không bịa.',
      messages: [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: `Thông tin trong gia phả:\n${context}\n\nCâu hỏi: ${question}` },
      ],
    });
    return {
      answer,
      sources: [
        ...memberList.map((m) => ({ type: 'MEMBER', id: String(m.member_id), title: m.full_name })),
        ...heritageList.map((h) => ({ type: 'HERITAGE', id: String(h.heritage_id), title: h.title })),
      ],
    };
  },
};
