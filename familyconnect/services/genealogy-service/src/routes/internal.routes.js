import { Router } from 'express';
import * as InternalController from '../controllers/InternalController.js';

const router = Router();

router.get('/memberships', InternalController.memberships);
router.get('/members/:id', InternalController.getMember);

export default router;
