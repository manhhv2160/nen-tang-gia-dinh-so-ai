import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../middleware/requireRole.js';
import * as TreeController from '../controllers/TreeController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), TreeController.get);

export default router;
