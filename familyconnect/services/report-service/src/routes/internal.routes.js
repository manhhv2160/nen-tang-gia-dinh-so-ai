// Route nội bộ /internal/... (gateway không công khai)
import { Router } from 'express';
import { AuditController } from '../controllers/AuditController.js';

const router = Router();
router.post('/audit', AuditController.create);
router.get('/stats', AuditController.stats);

export default router;
