import { Roles, roleAtLeast } from '../../../../shared/src/enums.js';
import { hasFamilyMembership } from '../repositories/AccessRepository.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export async function assertFamilyAccess(user, familyId, minimumRole) {
    if (!user?.userId) throw unauthorized();
    if (user.role === Roles.SYSTEM_ADMIN) return;
    if (!roleAtLeast(user.role, minimumRole)) throw forbidden();
    if (!(await hasFamilyMembership(user.userId, familyId))) {
        throw forbidden('You do not belong to this family');
    }
}
