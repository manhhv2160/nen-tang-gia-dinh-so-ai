/** Model Bài viết (khớp với bảng post của community-service). */
export class Post {
  constructor(data = {}) {
    this.post_id = String(data.post_id ?? '');
    this.family_id = String(data.family_id ?? '');
    this.user_id = String(data.user_id ?? '');
    this.post_type = data.post_type ?? 'GENERAL';
    this.title = data.title ?? null;
    this.content = data.content ?? '';
    this.created_at = data.created_at ?? null;
    this.updated_at = data.updated_at ?? null;
  }

  static from(data) {
    return new Post(data);
  }

  get hasTitle() {
    return Boolean(this.title && this.title.trim());
  }

  isAuthor(userId) {
    return String(this.user_id) === String(userId);
  }
}// Model Bài viết bài đăng
