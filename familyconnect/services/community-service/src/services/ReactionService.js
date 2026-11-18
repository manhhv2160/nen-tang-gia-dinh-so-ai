// Luật nghiệp vụ cho cảm xúc (docs/api-contract.md mục 5.3): mỗi người một cảm xúc cho mỗi bài.
// POST /reactions vừa thêm mới (201) vừa đổi loại nếu người này đã thả cảm xúc cho bài đó (200).
// Xóa: chính người thả (hoặc SYSTEM_ADMIN). Nhật ký (thẻ 48): có `audit` thì gửi, không thì bỏ qua.
import { AppError, Roles, ReactionTypes } from '../shared.js';
import { Validator, parsePaging, requireBody } from '../utils/validators.js';

export class ReactionService {
  constructor({ reactionRepository, postRepository, familyAccess, audit = null }) {
    this.reactions = reactionRepository;
    this.posts = postRepository;
    this.access = familyAccess;
    this.audit = audit;
  }

  /** Bắt buộc có post_id. Trả { rows, total }. */
  async listByPost(user, query = {}) {
    const v = new Validator();
    const postId = v.id(query.post_id, 'post_id');
    const { limit, offset } = parsePaging(query, v);
    v.done();

    const post = await this.#loadPost(postId);
    await this.access.assertCanAccess(user, post.family_id);
    return this.reactions.findByPost(post.post_id, { limit, offset });
  }

  /** reaction_type mặc định LIKE. Trả { reaction, created }: created = true nếu là cảm xúc mới. */
  async react(user, rawBody) {
    const body = requireBody(rawBody);
    const v = new Validator();
    const postId = v.id(body.post_id, 'post_id');
    const reactionType = v.enumValue(body.reaction_type, 'reaction_type', ReactionTypes, { fallback: ReactionTypes.LIKE });
    v.done();

    const post = await this.#loadPost(postId);
    await this.access.assertCanAccess(user, post.family_id);
    const result = await this.reactions.upsert({ postId: post.post_id, userId: user.userId, reactionType });
    this.audit?.record({
      userId: user.userId,
      action: result.created ? 'CREATE' : 'UPDATE',
      entityType: 'REACTION',
      entityId: result.reaction.reaction_id,
      familyId: post.family_id,
    });
    return result;
  }

  async remove(user, rawId) {
    const v = new Validator();
    const reactionId = v.id(rawId, 'id');
    v.done();
    const reaction = await this.reactions.findById(reactionId);
    if (!reaction) throw AppError.notFound('Reaction not found');
    const post = await this.#loadPost(reaction.post_id);
    await this.access.assertCanAccess(user, post.family_id);
    if (reaction.user_id !== user.userId && user.role !== Roles.SYSTEM_ADMIN) {
      throw AppError.forbidden('Only the person who reacted can remove this reaction');
    }
    await this.reactions.remove(reaction.reaction_id);
    this.audit?.record({ userId: user.userId, action: 'DELETE', entityType: 'REACTION', entityId: reaction.reaction_id, familyId: post.family_id });
    return null;
  }

  async #loadPost(postId) {
    const post = await this.posts.findById(postId);
    if (!post) throw AppError.notFound('Post not found');
    return post;
  }
}// Service: nghiệp vụ và kiểm tra dữ liệu
