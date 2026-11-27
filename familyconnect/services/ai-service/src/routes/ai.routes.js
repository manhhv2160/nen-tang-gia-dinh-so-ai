// Khai báo route ai và phân quyền (thành viên đã đăng nhập)
import { Router } from 'express';
import { requireMember } from '../middleware/requireMember.js';
import { SearchController } from '../controllers/SearchController.js';
import { AssistantController } from '../controllers/AssistantController.js';
import { RelationshipExplainController } from '../controllers/RelationshipExplainController.js';
import { SummarizationController } from '../controllers/SummarizationController.js';
import { RecommendationController } from '../controllers/RecommendationController.js';

const router = Router();
router.use(requireMember);

router.get('/search', SearchController.search);
router.post('/assistant', AssistantController.ask);
router.post('/explain-relationship', RelationshipExplainController.explain);
router.post('/summarize', SummarizationController.summarize);
router.get('/recommendations', RecommendationController.list);

export default router;
