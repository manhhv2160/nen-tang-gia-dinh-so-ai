// Controller: nhận request, gọi service, trả ApiResponse
import { ApiResponse } from '../../../../shared/src/ApiResponse.js';
import { AuditService } from '../services/AuditService.js';

export const AuditController = {
  // POST /internal/audit: trả 202 ngay, ghi DB sau; lỗi ghi chỉ in log (docs/api-contract.md)
  create(req, res) {
    const pending = AuditService.record(req.body);
    ApiResponse.accepted(res);
    pending.catch((err) => console.error('[report-service] Ghi audit_log thất bại:', err.message));
  },

  // GET /audit-logs (SYSTEM_ADMIN)
  async list(req, res) {
    ApiResponse.ok(res, await AuditService.list(req.query));
  },

  // GET /internal/stats
  async stats(req, res) {
    ApiResponse.ok(res, await AuditService.stats(req.query));
  },
};
