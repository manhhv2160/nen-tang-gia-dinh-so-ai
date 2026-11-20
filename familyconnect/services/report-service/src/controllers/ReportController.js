// Controller: báo cáo tổng hợp của một dòng họ (frontend xuất CSV/PDF từ dữ liệu này)
import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AppError } from '../../../../shared/src/AppError.js';
import { ServiceClients } from '../clients/ServiceClients.js';
import { resolveFamily } from '../services/familyAccess.js';
import { StatsAggregator } from '../services/StatsAggregator.js';

export const ReportController = {
  // GET /reports/family-summary?family_id=
  async familySummary(req, res) {
    const familyId = await resolveFamily(req);
    if (!familyId) throw AppError.validation({ family_id: 'required' });

    const [stats, upcoming] = await Promise.all([
      StatsAggregator.stats({ familyId, user: { ...req.user, role: 'FAMILY_ADMIN' } }), // không đưa số tài khoản toàn hệ thống vào báo cáo dòng họ
      ServiceClients.upcomingEvents(familyId, 10, req.user).then((v) => ({ ok: true, v }), () => ({ ok: false })),
    ]);
    const unavailable = [...stats.unavailable_services];
    if (!upcoming.ok) unavailable.push('event');
    ApiResponse.ok(res, {
      family_id: familyId,
      generated_at: stats.generated_at,
      partial: stats.partial || !upcoming.ok,
      unavailable_services: [...new Set(unavailable)],
      genealogy: stats.genealogy,
      community: stats.community,
      events: stats.events,
      heritage: stats.heritage,
      upcoming_events: upcoming.ok ? upcoming.v : null,
      members_by_generation: stats.genealogy?.members_by_generation ?? null,
    });
  },
};
