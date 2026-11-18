// Model Comment: comment_id, post_id, user_id, content, created_at, updated_at
export class Comment {
  constructor(row) {
    this.comment_id = String(row.comment_id);
    this.post_id = String(row.post_id);
    this.user_id = String(row.user_id);
    this.content = row.content;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
  }

  static from(row) {
    return row ? new Comment(row) : null;
  }
}// Model Comment: comment_id, post_id, user_id, content, created_at, updated_at
