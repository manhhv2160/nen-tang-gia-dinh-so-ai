const rateLimit = require('express-rate-limit');

// Giới hạn request chung (100 request / 15 phút)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            status_code: 429,
            message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau 15 phút',
            data: null
        });
    }
});

// Giới hạn đăng nhập sai (khóa 5 phút nếu sai 5 lần)
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            status_code: 429,
            message: 'Đăng nhập sai quá nhiều lần. Vui lòng đợi 5 phút trước khi thử lại.',
            data: null
        });
    }
});

module.exports = { apiLimiter, loginLimiter };