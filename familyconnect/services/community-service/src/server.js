// Khởi động community-service (cổng 3003).
import { config } from './config/index.js';
import { createPool } from './config/database.js';
import { GenealogyClient } from './clients/GenealogyClient.js';
import { compose } from './compose.js';

const pool = createPool(config.databaseUrl);
const genealogyClient = new GenealogyClient({
  baseUrl: config.genealogyUrl,
  timeoutMs: config.serviceTimeoutMs,
  cacheMs: config.membershipCacheMs,
  devFamilyIds: config.devFamilyIds,
});
if (config.devFamilyIds.length > 0) {
  console.warn(`[community-service] DEV_FAMILY_IDS=${config.devFamilyIds.join(',')}: bỏ qua genealogy-service, chỉ dùng khi phát triển`);
}

const server = compose({ pool, genealogyClient }).express.listen(config.port, () => {
  console.log(`[community-service] đang chạy tại cổng ${config.port}`);
});

// Dừng êm khi Docker gửi SIGTERM: ngừng nhận request mới rồi đóng kết nối database.
function shutdown(signal) {
  console.log(`[community-service] nhận ${signal}, đang dừng...`);
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
