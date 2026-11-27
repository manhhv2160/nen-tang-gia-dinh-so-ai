// Gợi ý theo từ khóa: thành viên cùng họ/cùng thế hệ và tư liệu có nhắc tới tên thành viên
import { GenealogyClient } from '../clients/GenealogyClient.js';
import { HeritageClient } from '../clients/HeritageClient.js';
import { assertFamilyAccess } from '../utils/access.js';

export const RecommendationService = {
  async recommend({ user, memberId, limit }) {
    const member = await GenealogyClient.member(memberId, user);
    await assertFamilyAccess(user, member.family_id);
    const familyId = String(member.family_id);
    const words = member.full_name.trim().split(/\s+/);
    const surname = words[0];
    const given = words[words.length - 1];

    const [relatives, byName, byGiven] = await Promise.allSettled([
      GenealogyClient.searchMembers(surname, [familyId], limit + 20, user),
      HeritageClient.search(member.full_name, [familyId], limit, user),
      HeritageClient.search(given, [familyId], limit, user),
    ]);

    const related_members = (relatives.status === 'fulfilled' ? relatives.value : [])
      .filter((m) => String(m.member_id) !== String(memberId))
      .sort((a, b) => Number(b.generation === member.generation) - Number(a.generation === member.generation))
      .slice(0, limit)
      .map((m) => ({
        member_id: String(m.member_id),
        full_name: m.full_name,
        reason: m.generation !== null && m.generation === member.generation ? `Cùng họ ${surname} và cùng thế hệ ${m.generation}` : `Cùng họ ${surname}`,
      }));

    const seen = new Set();
    const resources = [];
    for (const [result, reason] of [[byName, `Có nhắc đến ${member.full_name}`], [byGiven, `Có nhắc đến ${given}`]]) {
      if (result.status !== 'fulfilled') continue;
      for (const h of result.value) {
        if (seen.has(h.heritage_id) || resources.length >= limit) continue;
        seen.add(h.heritage_id);
        resources.push({ heritage_id: String(h.heritage_id), title: h.title, reason });
      }
    }
    return { member_id: String(memberId), related_members, resources };
  },
};
