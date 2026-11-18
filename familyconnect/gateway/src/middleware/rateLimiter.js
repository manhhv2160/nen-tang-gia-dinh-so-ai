const rateLimit = require('express-rate-limit');

const rateLimitResponse = (message) => ({
    success: false,
    status_code: 429,
    message,
    data: { code: 'RATE_LIMITED' }
});

// Giới hạn API công khai theo hợp đồng: 300 request mỗi phút trên mỗi IP.
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json(rateLimitResponse(
            'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.'
        ));
    }
});

// Chỉ tính các lần đăng nhập thất bại; phản hồi thành công không bị tính.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json(rateLimitResponse(
            'Bạn đã đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau 15 phút.'
        ));
    }
});

module.exports = { apiLimiter, loginLimiter };