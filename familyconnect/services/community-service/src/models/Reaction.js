// Model Reaction: reaction_id, post_id, user_id, reaction_type, created_at, updated_at
export class Reaction {
  constructor(row) {
    this.reaction_id = String(row.reaction_id);
    this.post_id = String(row.post_id);
    this.user_id = String(row.user_id);
    this.reaction_type = row.reaction_type;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
  }

  static from(row) {
    return row ? new Reaction(row) : null;
  }
}// Model Reaction: reaction_id, post_id, user_id, reaction_type, created_at, updated_at
