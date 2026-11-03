import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken } from './middleware/auth.js';
import { setupProxies } from './proxy/index.js';

// Cấu hình đường dẫn tuyệt đối cho ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());

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

// Kiểm tra JWT
app.use(verifyToken);

// Chuyển tiếp request đến đúng service
setupProxies(app);

// Xử lý lỗi
app.use((err, req, res, next) => {
    console.error('[Gateway Error]', err.stack);
    res.status(500).json({
        success: false,
        status_code: 500,
        message: 'Lỗi Gateway nội bộ',
        data: null
    });
});

export default app;