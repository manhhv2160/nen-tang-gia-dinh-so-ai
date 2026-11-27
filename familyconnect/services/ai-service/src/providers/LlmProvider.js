// Gọi mô hình ngôn ngữ (đổi nhà cung cấp chỉ sửa file này). Chưa cấu hình thì trả 503.
import { AppError, ErrorCodes } from '../../../../shared/src/AppError.js';
import { config } from '../config/index.js';

export const LlmProvider = {
  isEnabled() {
    return config.llm.provider !== 'none';
  },

  /** messages: [{ role: 'user' | 'assistant', content }]; trả chuỗi trả lời. */
  async complete({ system, messages, maxTokens = 1000 }) {
    if (!LlmProvider.isEnabled()) throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'Language model is not configured');
    if (config.llm.provider !== 'anthropic') {
      throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, `LLM provider '${config.llm.provider}' is not supported`);
    }
    if (!config.llm.apiKey) throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'LLM_API_KEY is missing');

    let res;
    try {
      res = await fetch(new URL('/v1/messages', config.llm.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.llm.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: config.llm.model, max_tokens: maxTokens, system, messages }),
        signal: AbortSignal.timeout(config.llm.timeoutMs),
      });
    } catch {
      throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'Cannot reach the language model');
    }
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'The language model returned an error');
    const text = (payload?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!text) throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'The language model returned no content');
    return text;
  },
};
