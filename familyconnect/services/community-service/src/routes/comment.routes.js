// Route bình luận và phân quyền (gateway: /api/v1/comments -> /api/comments).
import { Router } from 'express';
import { Roles, requireRole } from '../shared.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function commentRoutes(controller) {
  const router = Router();
  const member = requireRole(Roles.FAMILY_MEMBER);
  router.get('/', member, asyncHandler(controller.list));
  router.post('/', member, asyncHandler(controller.create));
  router.patch('/:id', member, asyncHandler(controller.update));
  router.delete('/:id', member, asyncHandler(controller.remove));
  return router;
}// Khai báo route comment và phân quyền
