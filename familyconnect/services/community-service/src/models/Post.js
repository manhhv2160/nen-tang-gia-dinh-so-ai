// Model Post (docs/api-contract.md mục 4): post_id, family_id, user_id, post_type, title, content,
// comment_count, reaction_counts, my_reaction (phản ứng của người đang gọi), created_at, updated_at.
export class Post {
  constructor(row) {
    this.post_id = String(row.post_id);
    this.family_id = String(row.family_id);
    this.user_id = String(row.user_id);
    this.post_type = row.post_type;
    this.title = row.title ?? null;
    this.content = row.content;
    this.comment_count = Number(row.comment_count ?? 0);
    this.reaction_counts = row.reaction_counts ?? {};
    this.my_reaction = row.mr_id
      ? {
        reaction_id: String(row.mr_id),
        post_id: String(row.post_id),
        user_id: String(row.mr_user_id),
        reaction_type: row.mr_type,
        created_at: row.mr_created_at,
        updated_at: row.mr_updated_at,
      }
      : null;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
  }

  static from(row) {
    return row ? new Post(row) : null;
  }
}// Model Post: post_id, family_id, user_id, post_type, title, content, created_at, updated_at
