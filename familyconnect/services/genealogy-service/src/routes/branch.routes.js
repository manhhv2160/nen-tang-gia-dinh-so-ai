import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../middleware/requireRole.js';
import * as BranchController from '../controllers/BranchController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), BranchController.list);
router.post('/', requireRole(Roles.FAMILY_ADMIN), BranchController.create);
router.get('/:id', requireRole(Roles.FAMILY_MEMBER), BranchController.get);
router.patch('/:id', requireRole(Roles.FAMILY_ADMIN), BranchController.update);
router.delete('/:id', requireRole(Roles.FAMILY_ADMIN), BranchController.remove);

export default router;
