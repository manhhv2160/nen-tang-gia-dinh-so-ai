import { MemberProfile } from './MemberProfile.js';

export class FamilyNode {
  constructor(data = {}) {
    this.profile = data instanceof MemberProfile ? data : new MemberProfile(data);
    this.member_id = this.profile.member_id;
    this.spouses = [];
    this.parents = [];
    this.children = [];
    this.relationship_type = null;
  }
}
