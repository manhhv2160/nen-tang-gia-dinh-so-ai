// Kiểm tra quyền theo dòng họ: người gọi phải có membership ở genealogy-service.
// Dùng chung cho post/comment/reaction để không lặp lại logic (FMLCN-46).
import { Roles, roleAtLeast } from '../../../../shared/src/enums.js';
import { getMemberships } from '../clients/GenealogyClient.js';
import { forbidden, unauthorized } from '../utils/errors.js';

/**
 * @param {{userId: string|null, role: string}} user
 * @param {string} familyId
 * @param {string} minimumRole vai trò tối thiểu (mặc định FAMILY_MEMBER)
 * @returns {Promise<{family_id: string, member_id: string, is_verified: boolean}|null>}
 *          null khi người gọi là SYSTEM_ADMIN (không cần membership).
 */
export async function assertFamilyAccess(user, familyId, minimumRole = Roles.FAMILY_MEMBER) {
    if (!user?.userId) throw unauthorized();
    if (user.role === Roles.SYSTEM_ADMIN) return null;
    if (!roleAtLeast(user.role, minimumRole)) throw forbidden();

    const memberships = await getMemberships(user.userId);
    const membership = memberships.find((item) => String(item.family_id) === String(familyId));
    if (!membership) throw forbidden('Bạn không thuộc dòng họ này');
    return membership;
}
