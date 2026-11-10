import express from 'express';
import { ApiResponse } from '../../../shared/src/ApiResponse.js';
import { userContext } from '../../../shared/src/userContext.js';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';
import { conflict, notFound } from './utils/errors.js';
import branchRoutes from './routes/branch.routes.js';
import familyRoutes from './routes/family.routes.js';
import internalRoutes from './routes/internal.routes.js';
import marriageRoutes from './routes/marriage.routes.js';
import memberRoutes from './routes/member.routes.js';
import relationshipRoutes, { relationQueryRouter } from './routes/relationship.routes.js';
import treeRoutes from './routes/tree.routes.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(userContext);
registerHealthRoute(app, 'genealogy-service');
app.use('/api/families', familyRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/marriages', marriageRoutes);
app.use('/api/tree', treeRoutes);
app.use('/api/relation-query', relationQueryRouter);
app.use('/internal', internalRoutes);

app.use((req, res, next) => next(notFound('Route not found')));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === '23505') return ApiResponse.fromError(res, conflict());
    if (error.code === '23503') {
        return ApiResponse.error(res, 400, 'Validation failed', {
            code: 'VALIDATION_ERROR',
            fields: {},
        });
    }
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
