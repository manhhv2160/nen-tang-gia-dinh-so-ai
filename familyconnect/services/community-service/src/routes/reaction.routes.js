// Khai báo route reaction và phân quyền. Mỗi người một cảm xúc cho mỗi bài.
import { Router } from 'express';
import { Roles } from '../../../../shared/src/enums.js';
import { requireRole } from '../../../../shared/src/requireRole.js';
import * as ReactionController from '../controllers/ReactionController.js';

const router = Router();

router.get('/', requireRole(Roles.FAMILY_MEMBER), ReactionController.list);
router.post('/', requireRole(Roles.FAMILY_MEMBER), ReactionController.setReaction);
router.delete('/:id', requireRole(Roles.FAMILY_MEMBER), ReactionController.remove);

export default router;
