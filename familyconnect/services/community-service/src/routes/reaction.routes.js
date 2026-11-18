// Route cảm xúc và phân quyền (gateway: /api/v1/reactions -> /api/reactions).
import { Router } from 'express';
import { Roles, requireRole } from '../shared.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function reactionRoutes(controller) {
  const router = Router();
  const member = requireRole(Roles.FAMILY_MEMBER);
  router.get('/', member, asyncHandler(controller.list));
  router.post('/', member, asyncHandler(controller.react));
  router.delete('/:id', member, asyncHandler(controller.remove));
  return router;
}// Khai báo route reaction và phân quyền
