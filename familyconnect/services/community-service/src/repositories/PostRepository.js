// Truy vấn bảng post. Chỉ dùng câu lệnh có tham số ($1, $2...) để tránh SQL injection.
// Mỗi bài kèm số bình luận, số cảm xúc theo loại và cảm xúc của người đang xem (my_reaction).
import { Post } from '../models/Post.js';

// $1 = id người đang xem (có thể NULL: không có my_reaction). reaction có UNIQUE (post_id, user_id) nên JOIN không nhân bản dòng.
const SELECT_ENRICHED = `
  SELECT p.*,
    (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.post_id)::int AS comment_count,
    COALESCE((
      SELECT jsonb_object_agg(t.reaction_type, t.n)
      FROM (SELECT reaction_type, COUNT(*)::int AS n FROM reaction r WHERE r.post_id = p.post_id GROUP BY reaction_type) t
    ), '{}'::jsonb) AS reaction_counts,
    mr.reaction_id AS mr_id, mr.user_id AS mr_user_id, mr.reaction_type AS mr_type,
    mr.created_at AS mr_created_at, mr.updated_at AS mr_updated_at
  FROM post p
  LEFT JOIN reaction mr ON mr.post_id = p.post_id AND mr.user_id = $1::bigint`;

export class PostRepository {
  constructor(db) {
    this.db = db;
  }

  /** Danh sách bài của một dòng họ. direction: 'ASC' | 'DESC' theo created_at. Trả { rows, total }. */
  async findAll({ familyId, postType = null, userId = null, direction = 'DESC', limit = 50, offset = 0, viewerId = null }) {
    const dir = direction === 'ASC' ? 'ASC' : 'DESC';
    const where = `WHERE p.family_id = $2::bigint
        AND ($3::text IS NULL OR p.post_type = $3)
        AND ($4::bigint IS NULL OR p.user_id = $4::bigint)`;
    const [list, count] = await Promise.all([
      this.db.query(
        `${SELECT_ENRICHED} ${where} ORDER BY p.created_at ${dir}, p.post_id ${dir} LIMIT $5 OFFSET $6`,
        [viewerId, familyId, postType, userId, limit, offset],
      ),
      this.db.query(
        `SELECT COUNT(*)::int AS n FROM post p
          WHERE p.family_id = $1::bigint AND ($2::text IS NULL OR p.post_type = $2) AND ($3::bigint IS NULL OR p.user_id = $3::bigint)`,
        [familyId, postType, userId],
      ),
    ]);
    return { rows: list.rows.map(Post.from), total: count.rows[0].n };
  }

  async findById(postId, viewerId = null) {
    const { rows } = await this.db.query(`${SELECT_ENRICHED} WHERE p.post_id = $2::bigint`, [viewerId, postId]);
    return Post.from(rows[0]);
  }

  async create({ familyId, userId, postType, title, content }) {
    const { rows } = await this.db.query(
      `INSERT INTO post (family_id, user_id, post_type, title, content)
       VALUES ($1::bigint, $2::bigint, $3, $4, $5) RETURNING post_id`,
      [familyId, userId, postType, title, content],
    );
    return this.findById(rows[0].post_id, userId);
  }

  /** Chỉ cập nhật các cột có trong `fields` (post_type, title, content). Trả về null nếu không có bài. */
  async update(postId, fields, viewerId = null) {
    const sets = [];
    const values = [postId];
    for (const [column, value] of Object.entries(fields)) {
      if (!['post_type', 'title', 'content'].includes(column)) continue;
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    }
    if (sets.length === 0) return this.findById(postId, viewerId);
    const { rowCount } = await this.db.query(
      `UPDATE post SET ${sets.join(', ')}, updated_at = now() WHERE post_id = $1::bigint`,
      values,
    );
    return rowCount ? this.findById(postId, viewerId) : null;
  }

  /** Xóa bài (bình luận và cảm xúc của bài bị xóa theo). Trả về true nếu có bài bị xóa. */
  async remove(postId) {
    const { rowCount } = await this.db.query('DELETE FROM post WHERE post_id = $1::bigint', [postId]);
    return rowCount > 0;
  }
}// Repository: truy vấn SQL vào community_db
