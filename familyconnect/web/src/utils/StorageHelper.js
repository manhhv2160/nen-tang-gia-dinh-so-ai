import { AppConfig } from '../constants/AppConfig.js';

/**
 * Lưu và đọc phiên đăng nhập (token + thông tin người dùng).
 * Mặc định dùng sessionStorage (mất khi đóng tab); remember=true thì dùng localStorage.
 * Lưu ý: bất kỳ nơi nào trong trình duyệt cũng có thể bị đánh cắp token nếu trang dính lỗi XSS,
 * nên luôn hiển thị nội dung người dùng bằng textContent, không dùng innerHTML.
 */
export class StorageHelper {
  static #stores() {
    return [globalThis.sessionStorage, globalThis.localStorage];
  }

  static #read(key) {
    for (const store of StorageHelper.#stores()) {
      try {
        const value = store?.getItem(key);
        if (value !== null && value !== undefined) return value;
      } catch { /* trình duyệt chặn storage */ }
    }
    return null;
  }

  static #write(key, value, remember) {
    const [session, local] = StorageHelper.#stores();
    for (const store of [session, local]) {
      try { store?.removeItem(key); } catch { /* bỏ qua */ }
    }
    try { (remember ? local : session)?.setItem(key, value); } catch { /* bỏ qua */ }
  }

  /** Lưu phiên sau khi đăng nhập thành công. */
  static setSession({ token, user }, remember = false) {
    StorageHelper.#write(AppConfig.STORAGE_TOKEN_KEY, token, remember);
    StorageHelper.#write(AppConfig.STORAGE_USER_KEY, JSON.stringify(user ?? null), remember);
  }

  static getToken() {
    return StorageHelper.#read(AppConfig.STORAGE_TOKEN_KEY);
  }

  static getUser() {
    try { return JSON.parse(StorageHelper.#read(AppConfig.STORAGE_USER_KEY)); } catch { return null; }
  }

  /** Vai trò hiện tại (chỉ để ẩn/hiện giao diện; server mới là nơi chặn quyền thật). */
  static getRole() {
    return StorageHelper.getUser()?.role ?? StorageHelper.getTokenPayload()?.role ?? null;
  }

  /** Giải mã phần payload của JWT (không kiểm tra chữ ký). Trả về null nếu token không phải JWT. */
  static getTokenPayload() {
    const part = StorageHelper.getToken()?.split('.')[1];
    if (!part) return null;
    try {
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    } catch {
      return null;
    }
  }

  /** Token đã hết hạn chưa? Token không đọc được hạn (ví dụ token mẫu) coi như còn hạn. */
  static isTokenExpired() {
    const exp = StorageHelper.getTokenPayload()?.exp;
    return typeof exp === 'number' && exp < Math.floor(Date.now() / 1000);
  }

  static isLoggedIn() {
    return !!StorageHelper.getToken() && !StorageHelper.isTokenExpired();
  }

  static clear() {
    for (const key of [AppConfig.STORAGE_TOKEN_KEY, AppConfig.STORAGE_USER_KEY]) {
      for (const store of StorageHelper.#stores()) {
        try { store?.removeItem(key); } catch { /* bỏ qua */ }
      }
    }
  }
}
