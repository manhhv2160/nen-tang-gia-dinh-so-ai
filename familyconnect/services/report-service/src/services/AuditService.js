// Service: nghiệp vụ và kiểm tra dữ liệu của nhật ký
import { AppError } from '../../../../shared/src/AppError.js';
import { AuditLog } from '../models/AuditLog.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';

const MAX_LIMIT = 200;

function parseDate(value, field) {
  if (value === undefined || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw AppError.validation({ [field]: 'must be a valid date-time' });
  return d.toISOString();
}

export const AuditService = {
  /**
   * Kiểm tra body ngay (ném 400 nếu sai), rồi trả Promise ghi DB.
   * Controller trả 202 trước và không chờ Promise này.
   */
  record(body) {
    const entry = AuditLog.fromRequest(body);
    return AuditLogRepository.insert(entry);
  },

  async list(query) {
    const filters = {
      user_id: query.user_id ? AuditLog.fromRequest({ action: 'x', entity_type: 'x', user_id: query.user_id }).user_id : null,
      action: query.action || null,
      entity_type: query.entity_type || null,
      entity_id: query.entity_id ? AuditLog.fromRequest({ action: 'x', entity_type: 'x', entity_id: query.entity_id }).entity_id : null,
      from: parseDate(query.from, 'from'),
      to: parseDate(query.to, 'to'),
    };
    const sort = query.sort || '-created_at';
    if (sort !== 'created_at' && sort !== '-created_at') {
      throw AppError.validation({ sort: 'must be created_at or -created_at' });
    }
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), MAX_LIMIT);
    const offset = Math.max(Number(query.offset) || 0, 0);
    const rows = await AuditLogRepository.find(filters, {
      order: sort === 'created_at' ? 'ASC' : 'DESC',
      limit,
      offset,
    });
    return rows.map(AuditLog.fromRow);
  },

  /** GET /internal/stats: số liệu nhật ký cho dashboard; family_id tùy chọn. */
  async stats(query) {
    const familyId = query.family_id
      ? AuditLog.fromRequest({ action: 'x', entity_type: 'x', family_id: query.family_id }).family_id
      : null;
    return AuditLogRepository.stats(familyId);
  },
};
