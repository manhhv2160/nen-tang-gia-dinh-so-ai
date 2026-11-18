// Controller bình luận: nhận request, gọi CommentService, trả ApiResponse.
import { ApiResponse } from '../shared.js';

export class CommentController {
  constructor(commentService) {
    this.service = commentService;
  }

  list = async (req, res) => {
    const { rows, total } = await this.service.listByPost(req.user, req.query);
    return ApiResponse.list(res, rows, total);
  };

  create = async (req, res) => ApiResponse.created(res, await this.service.create(req.user, req.body));

  update = async (req, res) => ApiResponse.ok(res, await this.service.update(req.user, req.params.id, req.body));

  remove = async (req, res) => ApiResponse.ok(res, await this.service.remove(req.user, req.params.id), 'Deleted');
}// Controller: nhận request, gọi service, trả ApiResponse
