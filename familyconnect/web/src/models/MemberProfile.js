export class MemberProfile {
  constructor(data = {}) {
    this.member_id = String(data.member_id ?? '');
    this.family_id = String(data.family_id ?? '');
    this.branch_id = data.branch_id == null ? null : String(data.branch_id);
    this.full_name = data.full_name ?? '';
    this.gender = data.gender ?? 'OTHER';
    this.date_of_birth = data.date_of_birth ?? null;
    this.date_of_death = data.date_of_death ?? null;
    this.generation = data.generation ?? null;
    this.occupation = data.occupation ?? null;
    this.education = data.education ?? null;
    this.address = data.address ?? null;
    this.bio = data.bio ?? null;
    this.is_verified = Boolean(data.is_verified);
  }
}
