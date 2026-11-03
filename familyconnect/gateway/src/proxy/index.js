import { createProxyMiddleware } from 'http-proxy-middleware';
import { HEALTH_ROUTES, ROUTES } from '../config/routes.js';

const onProxyError = (err, req, res) => {
    console.error('[Proxy Error]', err.message);
    if (res && !res.headersSent && typeof res.status === 'function') {
        res.status(503).json({
            success: false,
            status_code: 503,
            message: 'Service Temporarily Unavailable',
            data: null
        });
    }
};

export const setupProxies = (app) => {
    ROUTES.forEach(route => {
        app.use(createProxyMiddleware({
            target: route.target,
            changeOrigin: true,
            // Lọc theo tiền tố, KHÔNG cắt đường dẫn
            pathFilter: route.prefix,
            // /api/v1/auth/login  ->  /api/auth/login (khớp với auth-service)
            pathRewrite: { '^/api/v1': '/api' },
            onError: onProxyError,       // http-proxy-middleware bản 2
            on: { error: onProxyError }  // http-proxy-middleware bản 3
        }));
    });
};

export const setupHealthProxies = (app) => {
    HEALTH_ROUTES.forEach(route => {
        app.get(route.path, createProxyMiddleware({
            target: route.target,
            changeOrigin: true,
            pathRewrite: () => '/health',
            onProxyError,
            on: { error: onProxyError }
        }));
    });
};