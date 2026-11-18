// Truy vấn bảng reaction. Ràng buộc UNIQUE (post_id, user_id) đảm bảo mỗi người một cảm xúc cho mỗi bài.
import { Reaction } from '../models/Reaction.js';

export class ReactionRepository {
  constructor(db) {
    this.db = db;
  }

  /** Cảm xúc của một bài, cũ nhất trước. Trả { rows, total }. */
  async findByPost(postId, { limit = 50, offset = 0 } = {}) {
    const [list, count] = await Promise.all([
      this.db.query(
        `SELECT * FROM reaction WHERE post_id = $1::bigint
         ORDER BY created_at ASC, reaction_id ASC LIMIT $2 OFFSET $3`,
        [postId, limit, offset],
      ),
      this.db.query('SELECT COUNT(*)::int AS n FROM reaction WHERE post_id = $1::bigint', [postId]),
    ]);
    return { rows: list.rows.map(Reaction.from), total: count.rows[0].n };
  }

  async findById(reactionId) {
    const { rows } = await this.db.query('SELECT * FROM reaction WHERE reaction_id = $1::bigint', [reactionId]);
    return Reaction.from(rows[0]);
  }

  /** Thêm mới hoặc đổi loại cảm xúc nếu người này đã thả trước đó. created = true nếu là bản ghi mới. */
  async upsert({ postId, userId, reactionType }) {
    const { rows } = await this.db.query(
      `INSERT INTO reaction (post_id, user_id, reaction_type)
       VALUES ($1::bigint, $2::bigint, $3)
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET reaction_type = EXCLUDED.reaction_type, updated_at = now()
       RETURNING *, (xmax = 0) AS created`,
      [postId, userId, reactionType],
    );
    return { reaction: Reaction.from(rows[0]), created: rows[0].created };
  }

  async remove(reactionId) {
    const { rowCount } = await this.db.query('DELETE FROM reaction WHERE reaction_id = $1::bigint', [reactionId]);
    return rowCount > 0;
  }
}// Repository: truy vấn SQL vào community_db
