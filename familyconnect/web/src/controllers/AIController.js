// Ô "Trợ lý AI" trên tree.html: hỏi quan hệ kiểu "Khang là gì của Cúc?" hoặc hỏi tự do về gia phả
import { ApiClient } from '../services/ApiClient.js';
import { AIService } from '../services/AIService.js';
import { errorText } from '../utils/ErrorText.js';

// "A là gì của B" / "A là ai của B" / "A với B là gì": tách tên hai người
const PATTERNS = [
  /^(.+?)\s+(?:là\s+gì|là\s+ai|là\s+người\s+gì)\s+(?:của|với)\s+(.+?)\s*\??$/i,
  /^(?:quan\s+hệ\s+(?:giữa\s+)?)(.+?)\s+(?:và|với)\s+(.+?)\s*\??$/i,
];

export function parseRelationQuestion(text) {
  for (const re of PATTERNS) {
    const m = text.trim().match(re);
    if (m) return { to: m[1].trim(), from: m[2].trim() }; // "Khang là gì của Cúc": Khang là `to`, Cúc là `from`
  }
  return null;
}

export class AIController {
  constructor() {
    this.ai = new AIService();
    this.api = new ApiClient();
    this.history = [];
  }

  async init() {
    this.input = document.getElementById('ai-q');
    this.button = document.getElementById('ai-ask');
    this.out = document.getElementById('ai-answer');
    if (!this.input || !this.button) return;
    this.button.addEventListener('click', () => this.#ask());
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.#ask(); });
  }

  async #familyId() {
    const fromUrl = new URLSearchParams(globalThis.location.search).get('family_id');
    if (fromUrl) return fromUrl;
    const select = document.getElementById('family');
    if (select && /^\d+$/.test(select.value)) return select.value;
    const families = await this.api.get('/families');
    return families?.[0]?.family_id ?? null;
  }

  #show(text, isError = false) {
    this.out.textContent = text;
    this.out.classList.toggle('muted', !isError);
    this.out.style.color = isError ? 'var(--bad)' : '';
  }

  /** Tìm thành viên theo tên; trả member_id của kết quả đầu tiên, hoặc ném lỗi dễ hiểu. */
  async #findMember(name, familyId, notes) {
    const found = await this.ai.search(name, familyId, 5);
    if (!found.members.length) throw new Error(`Không tìm thấy thành viên "${name}" trong gia phả.`);
    if (found.members.length > 1) {
      const names = found.members.map((m) => `${m.full_name}${m.generation ? ` (thế hệ ${m.generation})` : ''}`).join('; ');
      notes.push(`Lưu ý: có nhiều người tên "${name}" (${names}); đã chọn ${found.members[0].full_name}.`);
    }
    return found.members[0].member_id;
  }

  async #ask() {
    const text = this.input.value.trim();
    if (!text) return;
    this.button.disabled = true;
    this.#show('Đang xử lý…');
    try {
      const familyId = await this.#familyId();
      if (!familyId) throw new Error('Bạn chưa thuộc dòng họ nào.');
      const rel = parseRelationQuestion(text);
      if (rel) {
        const notes = [];
        const [toId, fromId] = await Promise.all([this.#findMember(rel.to, familyId, notes), this.#findMember(rel.from, familyId, notes)]);
        const result = await this.ai.explainRelationship(fromId, toId);
        this.#show([result.explanation, ...notes].join(' '));
      } else {
        const result = await this.ai.ask(familyId, text, this.history.slice(-10));
        this.history.push({ role: 'user', content: text }, { role: 'assistant', content: result.answer });
        this.#show(result.answer);
      }
    } catch (err) {
      this.#show(err.statusCode === 503 ? 'Trợ lý AI chưa sẵn sàng, bạn vẫn có thể hỏi quan hệ dạng "A là gì của B?".' : errorText(err), true);
    } finally {
      this.button.disabled = false;
    }
  }
}
