// Class App: gắn middleware, route công khai, GET /health, xử lý lỗi. (Route /internal thêm ở thẻ 47.)
// Gateway đổi /api/v1/<tài nguyên> thành /api/<tài nguyên> rồi chuyển tới đây, nên route công khai nằm dưới /api.
import express from 'express';
import { ApiResponse, AppError, registerHealthRoute } from './shared.js';
import { postRoutes } from './routes/post.routes.js';
import { commentRoutes } from './routes/comment.routes.js';
import { reactionRoutes } from './routes/reaction.routes.js';

export class App {
  constructor({ postController, commentController, reactionController, serviceName = 'community-service' }) {
    this.express = express();
    const app = this.express;
    app.disable('x-powered-by');
    // Gateway không đọc body (không dùng express.json), nên service tự đọc JSON ở đây.
    app.use(express.json({ limit: '100kb' }));

    registerHealthRoute(app, serviceName);
    app.use('/api/posts', postRoutes(postController));
    app.use('/api/comments', commentRoutes(commentController));
    app.use('/api/reactions', reactionRoutes(reactionController));

    app.use((req, res) => ApiResponse.fromError(res, AppError.notFound('Route not found')));
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => ApiResponse.fromError(res, App.#translate(err)));
  }

  /** Đổi lỗi của body-parser (JSON sai, body quá lớn) thành AppError để trả đúng khuôn response chung. */
  static #translate(err) {
    if (err?.type === 'entity.parse.failed') return AppError.validation({ body: 'invalid JSON' });
    if (err?.type === 'entity.too.large') return AppError.payloadTooLarge();
    return err;
  }
}
