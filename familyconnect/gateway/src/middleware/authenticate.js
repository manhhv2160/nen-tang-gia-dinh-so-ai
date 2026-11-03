// Kiểm tra JWT; XÓA mọi X-User-* do client gửi rồi mới gắn X-User-Id, X-User-Role
import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // Nếu không có token, cứ cho qua (để các route public như login/register hoạt động)
    // Việc chặn route private sẽ do AuthGuard hoặc các service tự lo
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); 
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');
        
        // Gắn header ẩn nội bộ cho service phía sau biết là ai đang gọi
        req.headers['x-user-id'] = decoded.sub || decoded.user_id || decoded.id;
        req.headers['x-user-role'] = decoded.role;
        
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            status_code: 401,
            message: 'Token không hợp lệ hoặc đã hết hạn',
            data: null
        });
    }
};