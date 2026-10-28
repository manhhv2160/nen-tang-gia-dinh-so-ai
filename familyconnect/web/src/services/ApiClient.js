import { AppConfig } from '../constants/AppConfig.js';
import { StorageHelper } from '../utils/StorageHelper.js';

/** Lỗi trả về từ API hoặc từ mạng. statusCode = 0 nghĩa là không nhận được phản hồi. */
export class ApiError extends Error {
  constructor(statusCode, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Lớp cơ sở cho mọi service. Mỗi service kế thừa và gọi this.get/post/patch/delete.
 * Tự động: gắn token, đọc đúng định dạng { success, status_code, message, data },
 * trả về phần `data` khi thành công và ném ApiError khi thất bại.
 *
 *   class FamilyService extends ApiClient {
 *     list() { return this.get('/families'); }
 *   }
 */
export class ApiClient {
  constructor({
    baseUrl = AppConfig.API_BASE_URL,
    timeoutMs = AppConfig.REQUEST_TIMEOUT_MS,
    useMocks = AppConfig.USE_MOCKS,
    onUnauthorized = () => ApiClient.defaultOnUnauthorized(),
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.useMocks = useMocks;
    this.onUnauthorized = onUnauthorized;
  }

  get(path, options) { return this.request('GET', path, options); }
  post(path, body, options) { return this.request('POST', path, { ...options, body }); }
  patch(path, body, options) { return this.request('PATCH', path, { ...options, body }); }
  delete(path, options) { return this.request('DELETE', path, options); }

  /**
   * @param {string} method
   * @param {string} path  Ví dụ '/members' hoặc '/members/12'
   * @param {{ body?: object, query?: object, auth?: boolean }} options
   *        auth=false cho các API không cần đăng nhập (ví dụ đăng nhập, đăng ký).
   */
  async request(method, path, { body, query, auth = true } = {}) {
    const token = auth ? StorageHelper.getToken() : null;
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined && !this.useMocks) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res;
    let payload;
    try {
      res = await fetch(this.useMocks ? this.#mockUrl(method, path) : this.#url(path, query), {
        method: this.useMocks ? 'GET' : method,
        headers,
        body: body !== undefined && !this.useMocks ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      payload = await res.json().catch(() => null);
    } catch (err) {
      throw new ApiError(0, err?.name === 'AbortError' ? 'Hết thời gian chờ máy chủ' : 'Không kết nối được máy chủ');
    } finally {
      clearTimeout(timer);
    }

    // Chế độ dữ liệu mẫu: POST/PATCH/DELETE chưa có file mẫu riêng (xxx.post.json...) thì coi như thành công và trả lại body.
    if (this.useMocks && method !== 'GET' && !res.ok) return body ?? null;

    const wellFormed = payload && typeof payload.success === 'boolean';
    if (!wellFormed) {
      const hint = this.useMocks ? `Chưa có dữ liệu mẫu cho ${path}` : `Phản hồi không hợp lệ (HTTP ${res.status})`;
      throw new ApiError(res.status, hint);
    }
    if (!payload.success || !res.ok) {
      if (res.status === 401 && token) this.onUnauthorized();
      throw new ApiError(payload.status_code ?? res.status, payload.message ?? 'Đã xảy ra lỗi', payload.data ?? null);
    }
    return payload.data;
  }

  /** Mặc định khi token hết hạn/không hợp lệ: xóa phiên và chuyển về trang đăng nhập. */
  static defaultOnUnauthorized() {
    StorageHelper.clear();
    const here = globalThis.location?.pathname ?? '';
    if (!here.endsWith(AppConfig.LOGIN_PAGE) && here !== '/') {
      globalThis.location?.replace(AppConfig.LOGIN_PAGE);
    }
  }

  #url(path, query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') params.append(key, value);
    }
    const qs = params.toString();
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
  }

  // GET /members -> mocks/members.json ; POST /auth/login -> mocks/auth/login.post.json
  #mockUrl(method, path) {
    const suffix = method === 'GET' ? '' : `.${method.toLowerCase()}`;
    return `${AppConfig.MOCKS_BASE_URL}${path.split('?')[0]}${suffix}.json`;
  }
}
