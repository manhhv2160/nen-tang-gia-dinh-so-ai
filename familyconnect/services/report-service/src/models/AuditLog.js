// Model nhật ký: kiểm tra dữ liệu vào và đổi dòng DB thành JSON (ID là chuỗi theo docs/conventions.md)
import { AppError } from '../../../../shared/src/AppError.js';

const ID = /^\d{1,18}$/;

function optionalId(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value);
  if (!ID.test(s)) throw AppError.validation({ [field]: 'must be a positive integer' });
  return s;
}

function requiredText(value, field, max) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw AppError.validation({ [field]: 'required' });
  }
  if (value.trim().length > max) throw AppError.validation({ [field]: `max ${max} characters` });
  return value.trim();
}

export class AuditLog {
  
  static fromRequest(body = {}) {
    return {
      user_id: optionalId(body.user_id, 'user_id'),
      action: requiredText(body.action, 'action', 100),
      entity_type: requiredText(body.entity_type, 'entity_type', 50),
      entity_id: optionalId(body.entity_id, 'entity_id'),
      family_id: optionalId(body.family_id, 'family_id'),
    };
  }

  static fromRow(row) {
    return {
      audit_id: String(row.audit_id),
      user_id: row.user_id === null ? null : String(row.user_id),
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id === null ? null : String(row.entity_id),
      family_id: row.family_id === null ? null : String(row.family_id),
      created_at: row.created_at,
    };
  }
}
