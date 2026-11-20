// Khai báo route dashboard và phân quyền (thành viên đã đăng nhập, không phải GUEST)
import { Router } from 'express';
import { AppError } from '../../../../shared/src/AppError.js';
import { getUserContext } from '../../../../shared/src/userContext.js';
import { DashboardController } from '../controllers/DashboardController.js';

function requireMember(req, res, next) {
  const { userId, role } = getUserContext(req);
  if (!userId) throw AppError.unauthenticated();
  if (role === 'GUEST') throw AppError.forbidden();
  req.user = { id: userId, role };
  next();
}

const router = Router();
router.use(requireMember);
router.get('/stats', DashboardController.stats);
router.get('/activity', DashboardController.activity);

export default router;
