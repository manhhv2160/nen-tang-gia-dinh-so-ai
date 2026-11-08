import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../middleware/requireRole.js';
import * as MemberController from '../controllers/MemberController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), MemberController.list);
router.post('/', requireRole(Roles.FAMILY_ADMIN), MemberController.create);
router.get('/:id', requireRole(Roles.FAMILY_MEMBER), MemberController.get);
router.patch('/:id', requireRole(Roles.FAMILY_ADMIN), MemberController.update);
router.delete('/:id', requireRole(Roles.FAMILY_ADMIN), MemberController.remove);

export default router;
