// Gọi /internal/stats của từng service rồi gộp, service nào lỗi thì bỏ qua phần đó
import { ServiceClients } from '../clients/ServiceClients.js';

const ACTIVITY_SOURCES = ['community', 'event', 'heritage'];

export const StatsAggregator = {
  /**
   * @param {{ familyId: string|null, user: { id: string, role: string } }} args
   * @returns {{ generated_at, partial, unavailable_services, users?, genealogy, community, events, heritage }}
   */
  async stats({ familyId, user }) {
    const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
    const jobs = [
      ['genealogy', ServiceClients.genealogyStats(familyId, user)],
      ['community', ServiceClients.communityStats(familyId, user)],
      ['events', ServiceClients.eventStats(familyId, user)],
      ['heritage', ServiceClients.heritageStats(familyId, user)],
    ];
    if (isSystemAdmin) jobs.unshift(['users', ServiceClients.authStats(user)]);

    const results = await Promise.allSettled(jobs.map(([, p]) => p));
    const out = { generated_at: new Date().toISOString(), partial: false, unavailable_services: [] };
    results.forEach((r, i) => {
      const key = jobs[i][0];
      if (r.status === 'fulfilled') {
        out[key] = r.value;
      } else {
        out[key] = null;
        out.partial = true;
        out.unavailable_services.push(key === 'users' ? 'auth' : key === 'events' ? 'event' : key);
        console.error(`[report-service] Không lấy được số liệu ${key}:`, r.reason?.message);
      }
    });
    return out;
  },

  /** Gộp hoạt động của community, event, heritage; mới nhất trước. */
  async activity({ familyId, limit, user }) {
    const results = await Promise.allSettled(
      ACTIVITY_SOURCES.map((s) => ServiceClients.activity(s, familyId, limit, user)),
    );
    const failed = results.filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('[report-service] Không lấy được hoạt động:', r.reason?.message));
    if (failed.length === results.length) return null; // tất cả đều sập
    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },
};
