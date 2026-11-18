// Khai báo route nội bộ /internal/... (gateway không công khai).
// GET /internal/stats và /internal/activity thuộc thẻ FMLCN-47 (dashboard của report-service).
import { Router } from 'express';

const router = Router();

export default router;// Khai báo route nội bộ /internal/... (gateway không công khai) và phân quyền
