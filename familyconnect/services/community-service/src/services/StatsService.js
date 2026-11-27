import * as StatsRepository from '../repositories/StatsRepository.js';
import { failValidation, parseId } from '../utils/validation.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseLimit(value) {
    if (value === undefined) return DEFAULT_LIMIT;
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        failValidation({ limit: `must be an integer between 1 and ${MAX_LIMIT}` });
    }
    return limit;
}

/** GET /internal/stats?family_id= — family_id bỏ trống thì thống kê toàn hệ thống. */
export async function getStats(query = {}) {
    const familyId = query.family_id === undefined || query.family_id === ''
        ? null
        : parseId(query.family_id, 'family_id');
    return StatsRepository.getStats(familyId);
}

/** GET /internal/activity?family_id=&limit= — family_id bắt buộc (report luôn truyền). */
export async function getActivity(query = {}) {
    const familyId = parseId(query.family_id, 'family_id');
    return StatsRepository.listActivity(familyId, parseLimit(query.limit));
}
