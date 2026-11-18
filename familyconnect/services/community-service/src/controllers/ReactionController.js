// Controller cảm xúc: nhận request, gọi ReactionService, trả ApiResponse.
import { ApiResponse } from '../shared.js';

export class ReactionController {
  constructor(reactionService) {
    this.service = reactionService;
  }

  list = async (req, res) => {
    const { rows, total } = await this.service.listByPost(req.user, req.query);
    return ApiResponse.list(res, rows, total);
  };

  /** 201 khi là cảm xúc mới, 200 khi người này đổi loại cảm xúc của chính họ. */
  react = async (req, res) => {
    const { reaction, created } = await this.service.react(req.user, req.body);
    return created ? ApiResponse.created(res, reaction) : ApiResponse.ok(res, reaction, 'Updated');
  };

  remove = async (req, res) => ApiResponse.ok(res, await this.service.remove(req.user, req.params.id), 'Deleted');
}// Controller: nhận request, gọi service, trả ApiResponse
