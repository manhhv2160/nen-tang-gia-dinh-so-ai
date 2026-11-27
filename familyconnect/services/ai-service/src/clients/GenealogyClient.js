// Gọi /internal/... của genealogy-service (đồng bộ, timeout, một tầng)
import { callService } from '../../../../shared/src/httpClient.js';
import { config } from '../config/index.js';

const opts = (user, extra = {}) => ({ user: user && { userId: user.id, role: user.role }, timeoutMs: config.timeoutMs, ...extra });

export const GenealogyClient = {
  memberships: (userId) => callService(config.genealogyUrl, '/internal/memberships', { query: { user_id: userId }, timeoutMs: config.timeoutMs }),
  member: (memberId, user) => callService(config.genealogyUrl, `/internal/members/${memberId}`, opts(user)),
  relation: (from, to, user) =>
    callService(config.genealogyUrl, '/internal/relation-query', opts(user, { query: { from_member_id: from, to_member_id: to } })),
  searchMembers: (q, familyIds, limit, user) =>
    callService(config.genealogyUrl, '/internal/members/search', opts(user, { query: { q, family_ids: familyIds.join(','), limit } })),
};
