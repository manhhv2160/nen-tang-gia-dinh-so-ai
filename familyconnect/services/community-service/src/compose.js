// Ghép các lớp lại với nhau (repository -> service -> controller -> App).
// Tách khỏi server.js để kiểm thử có thể dựng App với database thử và GenealogyClient giả.
import { PostRepository } from './repositories/PostRepository.js';
import { CommentRepository } from './repositories/CommentRepository.js';
import { ReactionRepository } from './repositories/ReactionRepository.js';
import { FamilyAccess } from './services/FamilyAccess.js';
import { PostService } from './services/PostService.js';
import { CommentService } from './services/CommentService.js';
import { ReactionService } from './services/ReactionService.js';
import { PostController } from './controllers/PostController.js';
import { CommentController } from './controllers/CommentController.js';
import { ReactionController } from './controllers/ReactionController.js';
import { App } from './app.js';

/**
 * @param {{ pool: { query: Function },
 *           genealogyClient: { getFamilyIds: Function },
 *           audit?: { record: Function } }} deps  audit: tùy chọn, thêm ở thẻ 48
 */
export function compose({ pool, genealogyClient, audit = null }) {
  const postRepository = new PostRepository(pool);
  const commentRepository = new CommentRepository(pool);
  const reactionRepository = new ReactionRepository(pool);
  const familyAccess = new FamilyAccess(genealogyClient);

  return new App({
    postController: new PostController(new PostService({ postRepository, familyAccess, audit })),
    commentController: new CommentController(new CommentService({ commentRepository, postRepository, familyAccess, audit })),
    reactionController: new ReactionController(new ReactionService({ reactionRepository, postRepository, familyAccess, audit })),
  });
}