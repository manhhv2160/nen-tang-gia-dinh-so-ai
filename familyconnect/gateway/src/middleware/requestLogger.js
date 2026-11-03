// Ghi log mỗi request (phương thức, đường dẫn, mã trạng thái, thời gian)
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const timeLog = new Date().toISOString();
        console.log(`[${timeLog}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};

module.exports = requestLogger;