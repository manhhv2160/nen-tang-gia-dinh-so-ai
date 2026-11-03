// Chuyển tiếp request tới service đích, có timeout
import { createProxyMiddleware } from 'http-proxy-middleware';

export const ServiceProxy = (targetUrl) => {
    return createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        timeout: 5000, // Timeout 5 giây
        proxyTimeout: 5000,
        onProxyError: (err, req, res) => {
            console.error(`[Proxy Error] Tới ${targetUrl}:`, err.message);
            // Bắt lỗi 502 (Bad Gateway) hoặc 504 (Timeout)
            const status = (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') ? 502 : 504;
            res.status(status).json({
                success: false,
                status_code: status,
                message: 'Dịch vụ hiện không phản hồi, vui lòng thử lại sau',
                data: null
            });
        }
    });
};