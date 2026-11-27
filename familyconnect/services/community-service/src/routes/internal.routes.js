// Route nội bộ /internal/... — gateway chặn mọi đường dẫn chứa /internal/ nên chỉ service
// trong mạng Docker gọi được, không có xác thực riêng (docs/api-contract.md mục 6).
import { Router } from 'express';
import * as InternalController from '../controllers/InternalController.js';

const router = Router();

router.get('/stats', InternalController.stats);
router.get('/activity', InternalController.activity);

export default router;
