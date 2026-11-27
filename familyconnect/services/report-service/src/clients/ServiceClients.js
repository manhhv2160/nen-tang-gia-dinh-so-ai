// Gọi /internal/... của các service khác (đồng bộ, có timeout, chỉ một tầng)
import { config } from '../config/index.js';

async function call(service, path, query = {}, user = null) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.append(k, v);
  const qs = params.toString();
  const headers = { Accept: 'application/json' };
  if (user?.id) headers['X-User-Id'] = user.id;
  if (user?.role) headers['X-User-Role'] = user.role;

  const res = await fetch(`${config.urls[service]}${path}${qs ? `?${qs}` : ''}`, {
    headers,
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(`${service} ${path} trả về HTTP ${res.status}`);
  }
  return payload.data;
}

export const ServiceClients = {
  authStats: (user) => call('auth', '/internal/stats', {}, user),
  genealogyStats: (familyId, user) => call('genealogy', '/internal/stats', { family_id: familyId }, user),
  communityStats: (familyId, user) => call('community', '/internal/stats', { family_id: familyId }, user),
  eventStats: (familyId, user) => call('event', '/internal/stats', { family_id: familyId }, user),
  heritageStats: (familyId, user) => call('heritage', '/internal/stats', { family_id: familyId }, user),
  memberships: (userId) => call('genealogy', '/internal/memberships', { user_id: userId }),
  upcomingEvents: (familyId, limit, user) => call('event', '/internal/events/upcoming', { family_id: familyId, limit }, user),
  activity: (service, familyId, limit, user) =>
    call(service, '/internal/activity', { family_id: familyId, limit }, user),
};
