// Middleware kiểm tra vai trò, SYSTEM_ADMIN luôn được phép.
// requireRole('FAMILY_ADMIN') nghĩa là FAMILY_ADMIN trở lên (theo thứ bậc trong enums.js).
//   - Chưa có danh tính (thiếu hoặc sai X-User-Id): 401
//   - Có danh tính nhưng thiếu quyền: 403
// Ví dụ: router.delete('/:id', requireRole(Roles.FAMILY_ADMIN), controller.remove);

import { Roles, isValidEnum, roleAtLeast } from './enums.js';
import { AppError } from './AppError.js';
import { ApiResponse } from './ApiResponse.js';
import { getUserContext } from './userContext.js';

export function requireRole(minRole) {
  if (!isValidEnum(Roles, minRole)) {
    throw new Error(`requireRole: vai trò không hợp lệ: ${minRole}`);
  }
  return (req, res, next) => {
    const user = getUserContext(req);
    req.user = user;
    if (user.role === Roles.SYSTEM_ADMIN || roleAtLeast(user.role, minRole)) return next();
    const err = user.userId ? AppError.forbidden() : AppError.unauthorized();
    return ApiResponse.fromError(res, err);
  };
}
// Middleware kiểm tra vai trò, SYSTEM_ADMIN luôn được phép
