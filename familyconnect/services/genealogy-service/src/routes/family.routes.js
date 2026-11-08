import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../middleware/requireRole.js';
import * as FamilyController from '../controllers/FamilyController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), FamilyController.list);
router.post('/', requireRole(Roles.SYSTEM_ADMIN), FamilyController.create);
router.get('/:id', requireRole(Roles.FAMILY_MEMBER), FamilyController.get);
router.patch('/:id', requireRole(Roles.FAMILY_ADMIN), FamilyController.update);
router.delete('/:id', requireRole(Roles.SYSTEM_ADMIN), FamilyController.remove);

export default router;
