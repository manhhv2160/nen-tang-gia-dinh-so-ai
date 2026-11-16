import { ApiClient } from './ApiClient.js';

const PAGE_SIZE = 100;

export class GenealogyService extends ApiClient {
  listFamilies() {
    return this.get('/families', { query: { limit: PAGE_SIZE, sort: 'family_name' } });
  }

  listBranches(familyId) {
    return this.get('/branches', {
      query: { family_id: familyId, limit: PAGE_SIZE, sort: 'branch_name' },
    });
  }

  listMembers(familyId, filters = {}) {
    return this.get('/members', {
      query: { ...filters, family_id: familyId, limit: PAGE_SIZE, sort: filters.sort ?? 'generation' },
    });
  }

  async listAllMembers(familyId) {
    const members = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await this.get('/members', {
        query: { family_id: familyId, limit: PAGE_SIZE, offset, sort: 'generation' },
      });
      if (!Array.isArray(page)) throw new TypeError('Phản hồi danh sách thành viên không hợp lệ');
      members.push(...page);
      if (page.length < PAGE_SIZE) return members;
    }
  }

  getTree(familyId, branchId = '') {
    return this.get('/tree', { query: { family_id: familyId, branch_id: branchId || undefined } });
  }
}
