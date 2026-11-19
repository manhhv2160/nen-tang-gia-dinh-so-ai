// Hàm gọi REST giữa các service: timeout, đọc đúng định dạng response.
// Dùng cho các đường /internal/... (đồng bộ, có timeout, chuỗi gọi tối đa một tầng).
// Trả về `data` khi downstream thành công; ném AppError khi lỗi:
//   - downstream trả success=false với mã 4xx: giữ nguyên mã và nội dung
//   - downstream trả 5xx, trả sai định dạng, hoặc không kết nối được: 502
//   - quá thời gian chờ: 504
// Ví dụ: const member = await callService(config.genealogyUrl, `/internal/members/${id}`, { user: req.user });

import { AppError } from './AppError.js';

const DEFAULT_TIMEOUT_MS = 5000;

function isEnvelope(p) {
  return p !== null && typeof p === 'object'
    && typeof p.success === 'boolean'
    && Number.isInteger(p.status_code)
    && typeof p.message === 'string'
    && 'data' in p;
}

/**
 * @param {string} baseUrl ví dụ process.env.GENEALOGY_URL (http://genealogy-service:3002)
 * @param {string} path ví dụ '/internal/members/1'
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.query] tham số truy vấn (bỏ qua giá trị undefined/null)
 * @param {*} [options.body] gửi dạng JSON
 * @param {{userId?: string, role?: string}} [options.user] chuyển tiếp X-User-Id, X-User-Role
 * @param {number} [options.timeoutMs=5000]
 */
export async function callService(baseUrl, path, options = {}) {
  const { method = 'GET', query, body, user, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (user?.userId) {
    headers['X-User-Id'] = String(user.userId);
    headers['X-User-Role'] = String(user.role ?? 'GUEST');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let payload;
    try {
      payload = await response.json();
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw AppError.serviceUnavailable(`Dịch vụ ${url.host} trả dữ liệu không phải JSON`); 
    }
    if (!isEnvelope(payload)) {
      throw AppError.serviceUnavailable(`Dịch vụ ${url.host} trả sai định dạng response chung`);
    }
    if (!payload.success) {
      const code = payload.status_code >= 500 ? 502 : payload.status_code;
      throw new AppError(code, payload.message, payload.data);
    }
    return payload.data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      throw AppError.gatewayTimeout(`Dịch vụ ${url.host} không phản hồi sau ${timeoutMs} ms`);
    }
      throw AppError.serviceUnavailable(`Không gọi được dịch vụ ${url.host}`);
  } finally {
    clearTimeout(timer);
  }
}
// Hàm gọi REST giữa các service: timeout, đọc đúng định dạng response
