// GET /health dùng chung cho mọi service.
// Cách dùng: registerHealthRoute(app, 'community-service');

import { ApiResponse } from './ApiResponse.js';

/** Trả handler cho GET /health. */
export function healthRoute(serviceName) {
  return (req, res) => ApiResponse.ok(res, {
    service: serviceName,
    status: 'UP',
    time: new Date().toISOString(),
  });
}

/** Gắn GET /health vào app (hoặc router) kiểu Express. */
export function registerHealthRoute(app, serviceName) {
  app.get('/health', healthRoute(serviceName));
}
// GET /health dùng chung cho mọi service
