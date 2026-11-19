// Khởi động community-service (cổng 3003).
import app from './app.js';
import config from './config/index.js';
import pool from './config/database.js';

const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`community-service listening on port ${config.port}`);
});

// Docker gửi SIGTERM khi dừng container: ngừng nhận request rồi đóng kết nối database.
function shutdown(signal) {
    console.log(`[community-service] Received ${signal}, shutting down...`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
