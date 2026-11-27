// Tìm kiếm theo từ khóa (không phân biệt dấu) trên thành viên và tư liệu di sản
import { AppError } from '../../../../shared/src/AppError.js';
import { GenealogyClient } from '../clients/GenealogyClient.js';
import { HeritageClient } from '../clients/HeritageClient.js';
import { assertFamilyAccess } from '../utils/access.js';

export const SemanticSearchService = {
  async search({ user, q, familyId, limit }) {
    await assertFamilyAccess(user, familyId);
    const [members, heritages] = await Promise.allSettled([
      GenealogyClient.searchMembers(q, [familyId], limit, user),
      HeritageClient.search(q, [familyId], limit, user),
    ]);
    if (members.status === 'rejected' && heritages.status === 'rejected') {
      throw members.reason instanceof AppError ? members.reason : AppError.serviceUnavailable();
    }
    return {
      query: q,
      mode: 'KEYWORD', 
      members: members.status === 'fulfilled'
        ? members.value.map(({ member_id, full_name, generation }) => ({ member_id, full_name, generation }))
        : [],
      heritages: heritages.status === 'fulfilled'
        ? heritages.value.map(({ heritage_id, heritage_type, title }) => ({ heritage_id, heritage_type, title }))
        : [],
    };
  },
};
