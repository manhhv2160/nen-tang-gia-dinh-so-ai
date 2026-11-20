// Kiểm tra quyền xem dòng họ: SYSTEM_ADMIN xem được mọi nơi, còn lại phải thuộc dòng họ đó (hỏi genealogy)
import { AppError, ErrorCodes } from '../../../../shared/src/AppError.js';
import { ServiceClients } from '../clients/ServiceClients.js';

const ID = /^\d{1,18}$/;

export async function resolveFamily(req) {
  const { id, role } = req.user;
  const familyId = req.query.family_id || null;
  if (familyId && !ID.test(familyId)) throw AppError.validation({ family_id: 'must be a positive integer' });
  if (role === 'SYSTEM_ADMIN') return familyId;
  if (!familyId) throw AppError.validation({ family_id: 'required' });

  let data;
  try {
    data = await ServiceClients.memberships(id);
  } catch {
    throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'Cannot verify access right now');
  }
  const belongs = (data?.memberships ?? []).some((m) => String(m.family_id) === familyId);
  if (!belongs) throw AppError.forbidden();
  return familyId;
}
