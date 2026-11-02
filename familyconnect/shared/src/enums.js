// Enum dùng chung cho backend.
// Giá trị phải KHỚP CHÍNH XÁC với docs/conventions.md, CSDL và web/src/constants/Enums.js
// (viết hoa, gạch dưới). Không tự đổi tên.

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

/** Tập hợp tất cả enum, tra theo tên nhóm. */
export const Enums = Object.freeze({
  Roles, Gender, RelationshipTypes, MarriageStatus,
  PostTypes, ReactionTypes, RsvpStatus, HeritageTypes,
});

const ROLE_LEVEL = Object.freeze({ GUEST: 0, FAMILY_MEMBER: 1, FAMILY_ADMIN: 2, SYSTEM_ADMIN: 3 });

/** Giá trị có thuộc enum không. Ví dụ: isValidEnum(Gender, 'MALE') -> true */
export function isValidEnum(enumObj, value) {
  return Object.values(enumObj).includes(value);
}

/**
 * role có từ mức minRole trở lên không (cùng thứ bậc với roleAtLeast ở web/src/constants/Enums.js).
 * Ở backend, hàm này dùng để chặn quyền thật.
 */
export function roleAtLeast(role, minRole) {
  const level = Object.hasOwn(ROLE_LEVEL, role) ? ROLE_LEVEL[role] : -1;
  const min = Object.hasOwn(ROLE_LEVEL, minRole) ? ROLE_LEVEL[minRole] : Infinity;
  return level >= min;
}
// Roles, Gender, RelationshipTypes, MarriageStatus, PostTypes, ReactionTypes, RsvpStatus, HeritageTypes (khớp docs/conventions.md)
