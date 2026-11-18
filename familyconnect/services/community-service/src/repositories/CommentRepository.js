// Truy vấn bảng comment.
import { Comment } from '../models/Comment.js';

export class CommentRepository {
  constructor(db) {
    this.db = db;
  }

  /** Bình luận của một bài theo created_at. direction: 'ASC' (mặc định, cũ nhất trước) hoặc 'DESC'. Trả { rows, total }. */
  async findByPost(postId, { direction = 'ASC', limit = 50, offset = 0 } = {}) {
    const dir = direction === 'DESC' ? 'DESC' : 'ASC';
    const [list, count] = await Promise.all([
      this.db.query(
        `SELECT * FROM comment WHERE post_id = $1::bigint
         ORDER BY created_at ${dir}, comment_id ${dir} LIMIT $2 OFFSET $3`,
        [postId, limit, offset],
      ),
      this.db.query('SELECT COUNT(*)::int AS n FROM comment WHERE post_id = $1::bigint', [postId]),
    ]);
    return { rows: list.rows.map(Comment.from), total: count.rows[0].n };
  }

  async findById(commentId) {
    const { rows } = await this.db.query('SELECT * FROM comment WHERE comment_id = $1::bigint', [commentId]);
    return Comment.from(rows[0]);
  }

  async create({ postId, userId, content }) {
    const { rows } = await this.db.query(
      'INSERT INTO comment (post_id, user_id, content) VALUES ($1::bigint, $2::bigint, $3) RETURNING *',
      [postId, userId, content],
    );
    return Comment.from(rows[0]);
  }

  async updateContent(commentId, content) {
    const { rows } = await this.db.query(
      'UPDATE comment SET content = $2, updated_at = now() WHERE comment_id = $1::bigint RETURNING *',
      [commentId, content],
    );
    return Comment.from(rows[0]);
  }

  async remove(commentId) {
    const { rowCount } = await this.db.query('DELETE FROM comment WHERE comment_id = $1::bigint', [commentId]);
    return rowCount > 0;
  }
}// Repository: truy vấn SQL vào community_db
