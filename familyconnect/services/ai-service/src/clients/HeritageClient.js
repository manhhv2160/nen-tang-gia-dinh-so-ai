// Gọi /internal/... của heritage-service
import { callService } from '../../../../shared/src/httpClient.js';
import { config } from '../config/index.js';

export const HeritageClient = {
  search: (q, familyIds, limit, user) =>
    callService(config.heritageUrl, '/internal/heritages/search', {
      user: user && { userId: user.id, role: user.role },
      timeoutMs: config.timeoutMs,
      query: { q, family_ids: familyIds.join(','), limit },
    }),
};
