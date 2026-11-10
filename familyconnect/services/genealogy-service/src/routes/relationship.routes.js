import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../middleware/requireRole.js';
import * as RelationshipController from '../controllers/RelationshipController.js';

const router = Router();

router.get('/query', requireRole(Roles.FAMILY_MEMBER), RelationshipController.query);
router.get('/', requireRole(Roles.FAMILY_MEMBER), RelationshipController.list);
router.post('/', requireRole(Roles.FAMILY_ADMIN), RelationshipController.create);
router.patch('/:id', requireRole(Roles.FAMILY_ADMIN), RelationshipController.update);
router.delete('/:id', requireRole(Roles.FAMILY_ADMIN), RelationshipController.remove);

export const relationQueryRouter = Router();
relationQueryRouter.get('/', requireRole(Roles.FAMILY_MEMBER), RelationshipController.query);

export default router;
