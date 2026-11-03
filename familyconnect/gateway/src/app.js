const express = require('express');
const cors = require('cors');
const path = require('path');

// Import các module và middleware tự viết
const { verifyToken } = require('./middleware/auth.js');
const { setupProxies, setupHealthProxies } = require('./proxy/index.js');
const requestLogger = require('./middleware/requestLogger.js');
const { apiLimiter } = require('./middleware/rateLimiter.js');
const errorHandler = require('./middleware/errorHandler.js');

const app = express();

app.use(cors());

// 1. Thêm requestLogger theo yêu cầu của Bảo
app.use(requestLogger);

// 2. Thêm giới hạn request chung (chống spam)
app.use(apiLimiter);

// Phục vụ thư mục web (frontend) tĩnh
app.use(express.static(path.join(__dirname, '../../web')));

// KHÔNG dùng express.json() ở gateway: nó đọc mất body của POST nên request login/register sẽ bị treo

// Xóa mọi header x-user-* do client gửi lên (chống giả danh)
app.use((req, res, next) => {
    for (const header in req.headers) {
        if (header.toLowerCase().startsWith('x-user-')) {
            delete req.headers[header];
        }
    }
    next();
});

// Chặn truy cập trực tiếp vào các api nội bộ
app.use((req, res, next) => {
    if (req.path.includes('/internal/')) {
        return res.status(403).json({
            success: false,
            status_code: 403,
            message: 'Các đường dẫn internal không được truy cập công khai',
            data: null
        });
    }
    next();
});

// Kiểm tra sức khỏe Gateway
app.get('/health', (req, res) => res.status(200).json({ status: 'Gateway is OK' }));

// Chuyển tiếp health check tới từng service; các route này không yêu cầu JWT.
setupHealthProxies(app);

// Kiểm tra JWT
app.use(verifyToken);

// Chuyển tiếp request đến đúng service
setupProxies(app);

// 3. Sử dụng file errorHandler.js đã tách riêng
app.use(errorHandler);

module.exports = app;