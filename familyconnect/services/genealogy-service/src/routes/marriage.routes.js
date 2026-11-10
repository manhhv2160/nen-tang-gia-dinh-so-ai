import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../middleware/requireRole.js';
import * as MarriageController from '../controllers/MarriageController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), MarriageController.list);
router.post('/', requireRole(Roles.FAMILY_ADMIN), MarriageController.create);
router.patch('/:id', requireRole(Roles.FAMILY_ADMIN), MarriageController.update);
router.delete('/:id', requireRole(Roles.FAMILY_ADMIN), MarriageController.remove);

export default router;
