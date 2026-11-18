// Controller bài đăng: nhận request, gọi PostService, trả ApiResponse.
// Danh tính nằm ở req.user (do requireRole gắn từ header X-User-Id, X-User-Role).
import { ApiResponse } from '../shared.js';

export class PostController {
  constructor(postService) {
    this.service = postService;
  }

  list = async (req, res) => {
    const { rows, total } = await this.service.list(req.user, req.query);
    return ApiResponse.list(res, rows, total);
  };

  get = async (req, res) => ApiResponse.ok(res, await this.service.get(req.user, req.params.id));

  create = async (req, res) => ApiResponse.created(res, await this.service.create(req.user, req.body));

  update = async (req, res) => ApiResponse.ok(res, await this.service.update(req.user, req.params.id, req.body));

  remove = async (req, res) => ApiResponse.ok(res, await this.service.remove(req.user, req.params.id), 'Deleted');
}// Controller: nhận request, gọi service, trả ApiResponse
