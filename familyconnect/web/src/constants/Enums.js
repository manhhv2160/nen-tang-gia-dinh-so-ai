// Enums dùng chung cho frontend.
// Giá trị phải KHỚP CHÍNH XÁC với backend / CSDL (viết hoa, gạch dưới). Không tự đổi tên.

/** Phân quyền (RBAC), từ thấp đến cao. */
export const Roles = Object.freeze({
  GUEST: 'GUEST',
  FAMILY_MEMBER: 'FAMILY_MEMBER',
  FAMILY_ADMIN: 'FAMILY_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
});

/** gender trong hồ sơ thành viên. */
export const Gender = Object.freeze({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
});

/** relationship_type trong PARENT_CHILD_RELATIONSHIP. */
export const RelationshipTypes = Object.freeze({
  BIOLOGICAL: 'BIOLOGICAL',
  ADOPTED: 'ADOPTED',
});

/** status trong MARRIAGE. */
export const MarriageStatus = Object.freeze({
  MARRIED: 'MARRIED',
  DIVORCED: 'DIVORCED',
  WIDOWED: 'WIDOWED',
});

/** post_type trong POST. */
export const PostTypes = Object.freeze({
  NEWS: 'NEWS',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  GENERAL: 'GENERAL',
});

/** reaction_type trong REACTION. */
export const ReactionTypes = Object.freeze({
  LIKE: 'LIKE',
  LOVE: 'LOVE',
  HAHA: 'HAHA',
  WOW: 'WOW',
  SAD: 'SAD',
  ANGRY: 'ANGRY',
});

/** status trong RSVP. */
export const RsvpStatus = Object.freeze({
  ATTENDING: 'ATTENDING',
  DECLINED: 'DECLINED',
  MAYBE: 'MAYBE',
});

/** heritage_type trong HERITAGE. */
export const HeritageTypes = Object.freeze({
  HISTORICAL_DOC: 'HISTORICAL_DOC',
  STORY: 'STORY',
  OUTSTANDING_MEMBER: 'OUTSTANDING_MEMBER',
  PHOTO: 'PHOTO',
});

/** Tập hợp tất cả enum, tra theo tên nhóm (dùng cho EnumHelper). */
export const Enums = Object.freeze({
  Roles, Gender, RelationshipTypes, MarriageStatus,
  PostTypes, ReactionTypes, RsvpStatus, HeritageTypes,
});

/** Nhãn tiếng Việt để hiển thị trên giao diện. */
export const Labels = Object.freeze({
  Roles: {
    GUEST: 'Khách',
    FAMILY_MEMBER: 'Thành viên dòng họ',
    FAMILY_ADMIN: 'Quản trị dòng họ',
    SYSTEM_ADMIN: 'Quản trị hệ thống',
  },
  Gender: { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' },
  RelationshipTypes: { BIOLOGICAL: 'Con ruột', ADOPTED: 'Con nuôi' },
  MarriageStatus: { MARRIED: 'Đang kết hôn', DIVORCED: 'Đã ly hôn', WIDOWED: 'Góa' },
  PostTypes: { NEWS: 'Tin tức', ANNOUNCEMENT: 'Thông báo', GENERAL: 'Chung' },
  ReactionTypes: { LIKE: 'Thích', LOVE: 'Yêu thích', HAHA: 'Haha', WOW: 'Wow', SAD: 'Buồn', ANGRY: 'Phẫn nộ' },
  RsvpStatus: { ATTENDING: 'Sẽ tham dự', DECLINED: 'Từ chối', MAYBE: 'Có thể' },
  HeritageTypes: {
    HISTORICAL_DOC: 'Tài liệu lịch sử',
    STORY: 'Câu chuyện',
    OUTSTANDING_MEMBER: 'Thành viên tiêu biểu',
    PHOTO: 'Ảnh',
  },
});

const ROLE_LEVEL = Object.freeze({ GUEST: 0, FAMILY_MEMBER: 1, FAMILY_ADMIN: 2, SYSTEM_ADMIN: 3 });

export class EnumHelper {
  /** Danh sách giá trị của một enum. Ví dụ: EnumHelper.values(Gender) */
  static values(enumObj) {
    return Object.values(enumObj);
  }

  /** Kiểm tra giá trị có hợp lệ không. Ví dụ: EnumHelper.isValid(Gender, 'MALE') */
  static isValid(enumObj, value) {
    return Object.values(enumObj).includes(value);
  }

  /** Nhãn tiếng Việt. Ví dụ: EnumHelper.label('Gender', 'MALE') -> 'Nam'. Không có nhãn thì trả lại chính giá trị. */
  static label(group, value) {
    return Labels[group]?.[value] ?? value;
  }

  /** Danh sách { value, label } để đổ vào <select>. Ví dụ: EnumHelper.options('PostTypes') */
  static options(group) {
    const enumObj = Enums[group];
    if (!enumObj) throw new Error(`Unknown enum group: ${group}`);
    return Object.values(enumObj).map((value) => ({ value, label: Labels[group][value] ?? value }));
  }

  /**
   * role có từ mức minRole trở lên không.
   * Chỉ dùng để ẩn/hiện giao diện; việc chặn quyền thật phải do server làm.
   */
  static roleAtLeast(role, minRole) {
    return (ROLE_LEVEL[role] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
  }
}
