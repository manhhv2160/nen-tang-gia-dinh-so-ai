// Khai báo route báo cáo và phân quyền (quản trị dòng họ trở lên)
import { Router } from 'express';
import { AppError } from '../../../../shared/src/AppError.js';
import { getUserContext } from '../../../../shared/src/userContext.js';
import { ReportController } from '../controllers/ReportController.js';

function requireFamilyAdmin(req, res, next) {
  const { userId, role } = getUserContext(req);
  if (!userId) throw AppError.unauthenticated();
  if (role !== 'FAMILY_ADMIN' && role !== 'SYSTEM_ADMIN') throw AppError.forbidden();
  req.user = { id: userId, role };
  next();
}

const router = Router();
router.use(requireFamilyAdmin);
router.get('/family-summary', ReportController.familySummary);

export default router;
