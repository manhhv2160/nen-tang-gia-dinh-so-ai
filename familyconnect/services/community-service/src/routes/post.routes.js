// Khai báo route post và phân quyền: mọi thao tác cần FAMILY_MEMBER trở lên;
// quyền theo dòng họ và quyền "chính tác giả" kiểm tra ở PostService.
import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../../../../shared/src/requireRole.js';
import * as PostController from '../controllers/PostController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), PostController.list);
router.post('/', requireRole(Roles.FAMILY_MEMBER), PostController.create);
router.get('/:id', requireRole(Roles.FAMILY_MEMBER), PostController.get);
router.patch('/:id', requireRole(Roles.FAMILY_MEMBER), PostController.update);
router.delete('/:id', requireRole(Roles.FAMILY_MEMBER), PostController.remove);

export default router;
