// Quy tắc truy cập theo dòng họ, dùng chung cho Post, Comment, Reaction.
// - SYSTEM_ADMIN: mọi dòng họ.
// - Người khác: chỉ dòng họ mà genealogy-service cho biết họ thuộc về (qua /internal/memberships).
// - Kiểm duyệt (xóa nội dung của người khác): từ FAMILY_ADMIN trở lên và thuộc dòng họ đó.
import { AppError, Roles, roleAtLeast } from '../shared.js';

export class FamilyAccess {
  constructor(genealogyClient) {
    this.genealogy = genealogyClient;
  }

  async canAccess(user, familyId) {
    if (user.role === Roles.SYSTEM_ADMIN) return true;
    const ids = await this.genealogy.getFamilyIds(user);
    return ids.includes(String(familyId));
  }

  async assertCanAccess(user, familyId) {
    if (!(await this.canAccess(user, familyId))) throw AppError.forbidden('You do not belong to this family');
  }

  /** Có quyền kiểm duyệt nội dung trong dòng họ này không (FAMILY_ADMIN trở lên và thuộc dòng họ, hoặc SYSTEM_ADMIN). */
  async canModerate(user, familyId) {
    if (user.role === Roles.SYSTEM_ADMIN) return true;
    if (!roleAtLeast(user.role, Roles.FAMILY_ADMIN)) return false;
    return this.canAccess(user, familyId);
  }
}