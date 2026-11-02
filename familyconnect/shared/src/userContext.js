// Đọc X-User-Id và X-User-Role từ header do gateway gắn.
// Service không nhận danh tính từ nơi nào khác (docs/conventions.md).
// Gateway đã xóa mọi X-User-* do client gửi trước khi gắn lại, nên chỉ được mở cổng service qua gateway.

import { Roles, isValidEnum } from './enums.js';

/**
 * Trả { userId, role }.
 * - userId: chuỗi số (BIGINT ở dạng chuỗi), hoặc null nếu thiếu hoặc sai định dạng.
 * - role: một giá trị của Roles; thiếu, sai hoặc không có userId thì là GUEST.
 */
export function getUserContext(req) {
  const rawId = String(req?.headers?.['x-user-id'] ?? '').trim();
  const rawRole = String(req?.headers?.['x-user-role'] ?? '').trim();
  const userId = /^\d+$/.test(rawId) ? rawId : null;
  const role = userId && isValidEnum(Roles, rawRole) ? rawRole : Roles.GUEST;
  return { userId, role };
}

/** Middleware: gắn req.user = { userId, role }. */
export function userContext(req, res, next) {
  req.user = getUserContext(req);
  next();
}
// Đọc X-User-Id và X-User-Role từ header do gateway gắn
