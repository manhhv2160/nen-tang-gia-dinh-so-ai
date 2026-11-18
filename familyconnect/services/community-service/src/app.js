import express from 'express';
import { ApiResponse } from '../../../shared/src/ApiResponse.js';
import { AppError } from '../../../shared/src/AppError.js';
import { userContext } from '../../../shared/src/userContext.js';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';
import postRoutes from './routes/post.routes.js';
import commentRoutes from './routes/comment.routes.js';
import reactionRoutes from './routes/reaction.routes.js';
import internalRoutes from './routes/internal.routes.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(userContext);
registerHealthRoute(app, 'community-service');
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/internal', internalRoutes);

app.use((req, res, next) => next(new AppError(404, 'Route not found', { code: 'NOT_FOUND' })));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status === 400 && error.type === 'entity.parse.failed') {
        return ApiResponse.error(res, 400, 'Validation failed', {
            code: 'VALIDATION_ERROR',
            fields: { body: 'must contain valid JSON' },
        });
    }
    if (error.type === 'entity.too.large') {
        return ApiResponse.error(res, 413, 'Payload too large', { code: 'PAYLOAD_TOO_LARGE' });
    }
    return ApiResponse.fromError(res, error);
});

export default app;
