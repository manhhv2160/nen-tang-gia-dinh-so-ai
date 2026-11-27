import { ApiClient } from './ApiClient.js';

const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 100;

/** Gọi API community qua gateway: /posts, /comments, /reactions (docs/api-contract.md mục 5.3). */
export class CommunityService extends ApiClient {
  listFamilies() {
    return this.get('/families', { query: { limit: 100, sort: 'family_name' } });
  }

  listPosts(familyId, { postType = '', limit = PAGE_SIZE, offset = 0 } = {}) {
    return this.get('/posts', {
      query: { family_id: familyId, post_type: postType || undefined, limit, offset },
    });
  }

  createPost(body) {
    return this.post('/posts', body);
  }

  updatePost(postId, body) {
    return this.patch(`/posts/${postId}`, body);
  }

  deletePost(postId) {
    return this.delete(`/posts/${postId}`);
  }

  listComments(postId) {
    return this.get('/comments', { query: { post_id: postId, limit: COMMENT_PAGE_SIZE } });
  }

  createComment(postId, content) {
    return this.post('/comments', { post_id: postId, content });
  }

  deleteComment(commentId) {
    return this.delete(`/comments/${commentId}`);
  }

  listReactions(postId) {
    return this.get('/reactions', { query: { post_id: postId } });
  }

  /** Đã có cảm xúc thì server đổi loại, chưa có thì tạo mới. */
  react(postId, reactionType) {
    return this.post('/reactions', { post_id: postId, reaction_type: reactionType });
  }

  removeReaction(reactionId) {
    return this.delete(`/reactions/${reactionId}`);
  }

  /**
   * Tên người đăng bài: auth-service đã có GET /users.
   * Không lấy được (lỗi mạng/quyền) thì trả về Map rỗng và giao diện hiện "Thành viên #id".
   */
  async listUserNames() {
    const users = await this.get('/users');
    if (!Array.isArray(users)) throw new TypeError('Phản hồi danh sách người dùng không hợp lệ');
    return new Map(users.map((user) => [String(user.user_id), user.full_name || user.email || '']));
  }
}// Bài viết, bình luận, cảm xúc
