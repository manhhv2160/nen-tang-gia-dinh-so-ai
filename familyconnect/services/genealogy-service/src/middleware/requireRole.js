import { Roles, isValidEnum, roleAtLeast } from '../../../../shared/src/enums.js';
import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export function requireRole(minimumRole) {
    if (!isValidEnum(Roles, minimumRole)) {
        throw new Error(`requireRole: invalid role: ${minimumRole}`);
    }

    return (req, res, next) => {
        const user = req.user;
        if (user.role === Roles.SYSTEM_ADMIN || roleAtLeast(user.role, minimumRole)) {
            return next();
        }
        return ApiResponse.fromError(res, user.userId ? forbidden() : unauthorized());
    };
}
