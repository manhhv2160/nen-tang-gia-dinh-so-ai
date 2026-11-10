import { Router } from 'express';
import * as InternalController from '../controllers/InternalController.js';

const router = Router();

router.get('/memberships', InternalController.memberships);
router.get('/members/:id', InternalController.getMember);
router.get('/relation-query', InternalController.relationQuery);

export default router;
