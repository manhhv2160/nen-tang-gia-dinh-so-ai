// Luật nghiệp vụ cho bình luận (docs/api-contract.md mục 5.3).
// - Xem, viết: thành viên thuộc dòng họ của bài. Sửa: chính tác giả. Xóa: tác giả hoặc quản trị dòng họ.
// - SYSTEM_ADMIN được phép mọi thao tác. Nhật ký (thẻ 48): có `audit` thì gửi, không thì bỏ qua.
import { AppError, Roles } from '../shared.js';
import { Validator, parsePaging, parseSort, requireBody } from '../utils/validators.js';

const CONTENT_MAX = 10000;

export class CommentService {
  constructor({ commentRepository, postRepository, familyAccess, audit = null }) {
    this.comments = commentRepository;
    this.posts = postRepository;
    this.access = familyAccess;
    this.audit = audit;
  }

  /** Bắt buộc có post_id. Mặc định cũ nhất trước (sort=created_at). Trả { rows, total }. */
  async listByPost(user, query = {}) {
    const v = new Validator();
    const postId = v.id(query.post_id, 'post_id');
    const { limit, offset } = parsePaging(query, v);
    const { direction } = parseSort(query.sort, ['created_at'], 'created_at', v);
    v.done();

    const post = await this.#loadPost(postId);
    await this.access.assertCanAccess(user, post.family_id);
    return this.comments.findByPost(post.post_id, { direction, limit, offset });
  }

  async create(user, rawBody) {
    const body = requireBody(rawBody);
    const v = new Validator();
    const postId = v.id(body.post_id, 'post_id');
    const content = v.text(body.content, 'content', { max: CONTENT_MAX, required: true });
    v.done();

    const post = await this.#loadPost(postId);
    await this.access.assertCanAccess(user, post.family_id);
    const comment = await this.comments.create({ postId: post.post_id, userId: user.userId, content });
    this.audit?.record({ userId: user.userId, action: 'CREATE', entityType: 'COMMENT', entityId: comment.comment_id, familyId: post.family_id });
    return comment;
  }

  async update(user, rawId, rawBody) {
    const body = requireBody(rawBody);
    const comment = await this.#load(rawId);
    const post = await this.#loadPost(comment.post_id);
    await this.access.assertCanAccess(user, post.family_id);
    if (comment.user_id !== user.userId && user.role !== Roles.SYSTEM_ADMIN) {
      throw AppError.forbidden('Only the author can edit this comment');
    }
    const v = new Validator();
    const content = v.text(body.content, 'content', { max: CONTENT_MAX, required: true });
    v.done();
    const updated = await this.comments.updateContent(comment.comment_id, content);
    this.audit?.record({ userId: user.userId, action: 'UPDATE', entityType: 'COMMENT', entityId: comment.comment_id, familyId: post.family_id });
    return updated;
  }

  async remove(user, rawId) {
    const comment = await this.#load(rawId);
    const post = await this.#loadPost(comment.post_id);
    await this.access.assertCanAccess(user, post.family_id);
    if (comment.user_id !== user.userId && !(await this.access.canModerate(user, post.family_id))) {
      throw AppError.forbidden('Only the author or a family admin can delete this comment');
    }
    await this.comments.remove(comment.comment_id);
    this.audit?.record({ userId: user.userId, action: 'DELETE', entityType: 'COMMENT', entityId: comment.comment_id, familyId: post.family_id });
    return null;
  }

  async #load(rawId) {
    const v = new Validator();
    const commentId = v.id(rawId, 'id');
    v.done();
    const comment = await this.comments.findById(commentId);
    if (!comment) throw AppError.notFound('Comment not found');
    return comment;
  }

  async #loadPost(postId) {
    const post = await this.posts.findById(postId);
    if (!post) throw AppError.notFound('Post not found');
    return post;
  }
}// Service: nghiệp vụ và kiểm tra dữ liệu
