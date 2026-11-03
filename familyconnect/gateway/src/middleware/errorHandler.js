const errorHandler = (err, req, res, next) => {
    console.error('[Gateway Error]', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống Gateway', 
        error: err.message 
    });
};

module.exports = errorHandler;