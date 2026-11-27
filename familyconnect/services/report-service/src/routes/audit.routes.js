// Route công khai /audit-logs: chỉ SYSTEM_ADMIN (gateway gắn X-User-Id, X-User-Role)
import { Router } from 'express';
import { AppError } from '../../../../shared/src/AppError.js';
import { getUserContext } from '../../../../shared/src/userContext.js';
import { AuditController } from '../controllers/AuditController.js';

function requireSystemAdmin(req, res, next) {
  const { userId, role } = getUserContext(req);
  if (!userId) throw AppError.unauthenticated();
  if (role !== 'SYSTEM_ADMIN') throw AppError.forbidden();
  next();
}

const router = Router();
router.get('/', requireSystemAdmin, AuditController.list);

export default router;
