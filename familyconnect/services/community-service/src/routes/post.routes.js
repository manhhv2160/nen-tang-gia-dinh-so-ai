// Route bài đăng và phân quyền. Gateway đổi /api/v1/posts thành /api/posts.
// Mọi thao tác cần FAMILY_MEMBER trở lên (khách chưa được xác minh không xem được dữ liệu gia đình).
import { Router } from 'express';
import { Roles, requireRole } from '../shared.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function postRoutes(controller) {
  const router = Router();
  const member = requireRole(Roles.FAMILY_MEMBER);
  router.get('/', member, asyncHandler(controller.list));
  router.get('/:id', member, asyncHandler(controller.get));
  router.post('/', member, asyncHandler(controller.create));
  router.patch('/:id', member, asyncHandler(controller.update));
  router.delete('/:id', member, asyncHandler(controller.remove));
  return router;
}// Khai báo route post và phân quyền
