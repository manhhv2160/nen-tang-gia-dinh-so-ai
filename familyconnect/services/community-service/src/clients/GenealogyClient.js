// Client gọi sang genealogy-service qua /internal/... để biết người dùng thuộc dòng họ nào.
// Kết quả được cache ngắn (30 giây) để một request hiển thị bảng tin không gọi lặp lại.
import { callService } from '../../../../shared/src/httpClient.js';
import config from '../config/index.js';

const TTL_MS = 30_000;
const cache = new Map();

/**
 * Danh sách membership của một tài khoản: [{ family_id, member_id, is_verified }].
 * Người dùng chưa gắn thành viên nào thì trả về mảng rỗng.
 */
export async function getMemberships(userId) {
    const key = String(userId);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.memberships;

    const data = await callService(config.genealogyUrl, '/internal/memberships', {
        query: { user_id: userId },
    });
    const memberships = Array.isArray(data?.memberships) ? data.memberships : [];
    cache.set(key, { expiresAt: Date.now() + TTL_MS, memberships });
    return memberships;
}

/** Xóa cache sau khi thành viên được xác minh/gỡ khỏi dòng họ (dùng ở thẻ khác nếu cần). */
export function invalidateMemberships(userId) {
    cache.delete(String(userId));
}
