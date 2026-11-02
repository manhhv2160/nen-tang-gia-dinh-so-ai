// Model Người dùng / Tài khoản
import { EnumHelper, Roles, Labels } from '../constants/Enums.js';

/** Thông tin người dùng đang đăng nhập (khớp với dữ liệu auth-service trả về). */
export class User {
  constructor({ user_id, email, full_name, phone, role, created_at, updated_at } = {}) {
    this.userId = user_id ?? null;
    this.email = email ?? '';
    this.fullName = full_name ?? '';
    this.phone = phone ?? '';
    this.role = role ?? Roles.GUEST;
    this.createdAt = created_at ?? null;
    this.updatedAt = updated_at ?? null;
  }

  static from(data) {
    return data ? new User(data) : null;
  }

  /** Tên hiển thị: ưu tiên họ tên, không có thì dùng email. */
  get displayName() {
    return this.fullName || this.email;
  }

  /** Nhãn vai trò bằng tiếng Việt. */
  get roleLabel() {
    return Labels.Roles[this.role] ?? this.role;
  }

  /** Có vai trò từ minRole trở lên không (chỉ để ẩn/hiện giao diện, server mới chặn quyền thật). */
  hasRole(minRole) {
    return EnumHelper.roleAtLeast(this.role, minRole);
  }

  isFamilyMember() { return this.hasRole(Roles.FAMILY_MEMBER); }
  isFamilyAdmin() { return this.hasRole(Roles.FAMILY_ADMIN); }
  isSystemAdmin() { return this.hasRole(Roles.SYSTEM_ADMIN); }
}