// Gọi genealogy-service (Người 2): xem người dùng thuộc dòng họ nào.
// GET /internal/memberships?user_id=  ->  { user_id, memberships: [{ family_id, member_id, is_verified }] } (docs/api-contract.md mục 6)
// Kết quả được lưu tạm tối đa 60 giây cho mỗi người dùng; timeout 3 giây.
import { callService } from '../shared.js';

/** Lấy danh sách family_id (chuỗi, không trùng) từ data của /internal/memberships. */
export function extractFamilyIds(data) {
  const list = Array.isArray(data) ? data : data?.memberships;
  const ids = (Array.isArray(list) ? list : [])
    .map((item) => (item !== null && typeof item === 'object' ? item.family_id : item))
    .filter((value) => value !== undefined && value !== null && /^\d+$/.test(String(value)))
    .map((value) => String(value));
  return [...new Set(ids)];
}

const MAX_CACHE_ENTRIES = 1000;

export class GenealogyClient {
  /**
   * @param {{ baseUrl: string, timeoutMs?: number, cacheMs?: number, devFamilyIds?: string[], now?: () => number }} options
   *   devFamilyIds: chỉ dùng khi phát triển (DEV_FAMILY_IDS), bỏ qua việc gọi genealogy-service.
   */
  constructor({ baseUrl, timeoutMs = 3000, cacheMs = 60000, devFamilyIds = [], now = () => Date.now() }) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.cacheMs = cacheMs;
    this.devFamilyIds = devFamilyIds;
    this.now = now;
    this.cache = new Map();
  }

  /** Danh sách family_id (chuỗi) mà người dùng thuộc về. */
  async getFamilyIds(user) {
    if (this.devFamilyIds.length > 0) return this.devFamilyIds;
    const hit = this.cache.get(user.userId);
    if (hit && hit.expiresAt > this.now()) return hit.ids;

    const data = await callService(this.baseUrl, '/internal/memberships', {
      query: { user_id: user.userId },
      user,
      timeoutMs: this.timeoutMs,
    });
    const ids = extractFamilyIds(data);
    if (this.cacheMs > 0) {
      if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.clear();
      this.cache.set(user.userId, { ids, expiresAt: this.now() + this.cacheMs });
    }
    return ids;
  }

  clearCache() {
    this.cache.clear();
  }
}// Client gọi sang genealogy-service qua /internal/...
