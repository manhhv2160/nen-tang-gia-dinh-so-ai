// Giải thích quan hệ bằng tiếng Việt, theo luật (không cần mô hình ngôn ngữ)
import { GenealogyClient } from '../clients/GenealogyClient.js';
import { assertFamilyAccess } from '../utils/access.js';

function labelOf(relation, to) {
  const male = to.gender === 'MALE';
  const female = to.gender === 'FEMALE';
  switch (relation) {
    case 'SELF': return null;
    case 'SPOUSE': return male ? 'chồng' : female ? 'vợ' : 'vợ/chồng';
    case 'PARENT': return male ? 'cha' : female ? 'mẹ' : 'cha/mẹ';
    case 'CHILD': return male ? 'con trai' : female ? 'con gái' : 'con';
    case 'SIBLING': return 'anh/chị/em ruột';
    case 'GRANDPARENT': return male ? 'ông' : female ? 'bà' : 'ông/bà';
    case 'GRANDCHILD': return 'cháu (con của con)';
    case 'NIECE_NEPHEW': return 'cháu (con của anh/chị/em)';
    case 'UNCLE_AUNT': return 'bác/chú/cô/dì/cậu';
    case 'COUSIN': return 'anh/chị/em họ';
    case 'OTHER': return 'họ hàng';
    default: return null;
  }
}

export const RelationshipExplainService = {
  labelOf,

  async explain({ user, fromMemberId, toMemberId }) {
    const [from, to] = await Promise.all([
      GenealogyClient.member(fromMemberId, user),
      GenealogyClient.member(toMemberId, user),
    ]);
    await assertFamilyAccess(user, from.family_id);
    await assertFamilyAccess(user, to.family_id);

    const q = await GenealogyClient.relation(fromMemberId, toMemberId, user);
    const names = new Map([[String(from.member_id), from.full_name], [String(to.member_id), to.full_name]]);
    const path = await Promise.all((q.path ?? []).map(async (p) => {
      const id = String(p.member_id);
      if (!names.has(id)) names.set(id, (await GenealogyClient.member(id, user)).full_name);
      return { member_id: id, step: p.step };
    }));

    let explanation;
    if (q.relation === 'NONE') explanation = `Không tìm thấy quan hệ trực tiếp giữa ${from.full_name} và ${to.full_name} trong gia phả.`;
    else if (q.relation === 'SELF') explanation = `${from.full_name} và ${to.full_name} là cùng một người.`;
    else {
      const label = labelOf(q.relation, to);
      explanation = `${to.full_name} là ${label} của ${from.full_name}.`;
      if (q.relation === 'OTHER' && path.length) {
        explanation += ` Quan hệ đi qua: ${path.map((p) => names.get(p.member_id)).join(' → ')}.`;
      }
    }
    return { relation: q.relation, explanation, path };
  },
};
