import express from 'express';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';

const app = express();

registerHealthRoute(app, 'ai-service');
app.use('/api/ai', aiRoutes);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return ApiResponse.error(res, 400, 'VALIDATION_ERROR', 'Invalid JSON body');
  }
  return ApiResponse.fromError(res, err);
});
export default app;
