// Khai báo route comment và phân quyền (dòng họ lấy theo bài viết).
import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../../../../shared/src/requireRole.js';
import * as CommentController from '../controllers/CommentController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), CommentController.list);
router.post('/', requireRole(Roles.FAMILY_MEMBER), CommentController.create);
router.patch('/:id', requireRole(Roles.FAMILY_MEMBER), CommentController.update);
router.delete('/:id', requireRole(Roles.FAMILY_MEMBER), CommentController.remove);

export default router;
