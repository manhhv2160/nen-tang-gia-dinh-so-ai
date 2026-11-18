// Luật nghiệp vụ cho bài đăng (docs/api-contract.md mục 5.3).
// - Xem, đăng: thành viên (đã chặn ở route) và thuộc dòng họ của bài. SYSTEM_ADMIN vào mọi dòng họ.
// - Sửa: chính tác giả (hoặc SYSTEM_ADMIN). Xóa: tác giả hoặc quản trị dòng họ (hoặc SYSTEM_ADMIN).
// - Nhật ký thao tác (thẻ 48): nếu được truyền `audit` thì mỗi thao tác tạo, sửa, xóa gửi nhật ký, không thì bỏ qua.
import { AppError, Roles, PostTypes } from '../shared.js';
import { Validator, parsePaging, parseSort, requireBody } from '../utils/validators.js';

const TITLE_MAX = 255;
const CONTENT_MAX = 10000;

export class PostService {
  constructor({ postRepository, familyAccess, audit = null }) {
    this.posts = postRepository;
    this.access = familyAccess;
    this.audit = audit;
  }

  /** Danh sách bài của một dòng họ. Trả { rows, total }. */
  async list(user, query = {}) {
    const v = new Validator();
    const familyId = v.id(query.family_id, 'family_id');
    const postType = v.enumValue(query.post_type, 'post_type', PostTypes);
    const userId = v.id(query.user_id, 'user_id', { required: false });
    const { limit, offset } = parsePaging(query, v);
    const { direction } = parseSort(query.sort, ['created_at'], '-created_at', v);
    v.done();

    await this.access.assertCanAccess(user, familyId);
    return this.posts.findAll({ familyId, postType, userId, direction, limit, offset, viewerId: user.userId });
  }

  async get(user, rawId) {
    const post = await this.#load(rawId, user);
    await this.access.assertCanAccess(user, post.family_id);
    return post;
  }

  async create(user, rawBody) {
    const body = requireBody(rawBody);
    const v = new Validator();
    const familyId = v.id(body.family_id, 'family_id');
    const postType = v.enumValue(body.post_type, 'post_type', PostTypes, { fallback: PostTypes.GENERAL });
    const title = v.text(body.title, 'title', { max: TITLE_MAX });
    const content = v.text(body.content, 'content', { max: CONTENT_MAX, required: true });
    v.done();

    await this.access.assertCanAccess(user, familyId);
    const post = await this.posts.create({ familyId, userId: user.userId, postType, title, content });
    this.audit?.record({ userId: user.userId, action: 'CREATE', entityType: 'POST', entityId: post.post_id, familyId });
    return post;
  }

  /** Sửa một phần: chỉ title, content, post_type; null hoặc chuỗi rỗng ở title để xóa tiêu đề. Trường khác bị bỏ qua. */
  async update(user, rawId, rawBody) {
    const body = requireBody(rawBody);
    const post = await this.#load(rawId, user);
    await this.access.assertCanAccess(user, post.family_id);
    if (post.user_id !== user.userId && user.role !== Roles.SYSTEM_ADMIN) {
      throw AppError.forbidden('Only the author can edit this post');
    }

    const v = new Validator();
    const fields = {};
    if ('title' in body) fields.title = v.text(body.title, 'title', { max: TITLE_MAX });
    if ('content' in body) fields.content = v.text(body.content, 'content', { max: CONTENT_MAX, required: true });
    if ('post_type' in body) fields.post_type = v.enumValue(body.post_type, 'post_type', PostTypes, { required: true });
    v.done();
    if (Object.keys(fields).length === 0) return post;

    const updated = await this.posts.update(post.post_id, fields, user.userId);
    if (!updated) throw AppError.notFound('Post not found');
    this.audit?.record({ userId: user.userId, action: 'UPDATE', entityType: 'POST', entityId: post.post_id, familyId: post.family_id });
    return updated;
  }

  async remove(user, rawId) {
    const post = await this.#load(rawId, user);
    await this.access.assertCanAccess(user, post.family_id);
    if (post.user_id !== user.userId && !(await this.access.canModerate(user, post.family_id))) {
      throw AppError.forbidden('Only the author or a family admin can delete this post');
    }
    await this.posts.remove(post.post_id);
    this.audit?.record({ userId: user.userId, action: 'DELETE', entityType: 'POST', entityId: post.post_id, familyId: post.family_id });
    return null;
  }

  async #load(rawId, user) {
    const v = new Validator();
    const postId = v.id(rawId, 'id');
    v.done();
    const post = await this.posts.findById(postId, user.userId);
    if (!post) throw AppError.notFound('Post not found');
    return post;
  }
}// Service: nghiệp vụ và kiểm tra dữ liệu
