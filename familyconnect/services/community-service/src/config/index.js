// Đọc biến môi trường (PORT, DATABASE_URL, địa chỉ các service cần gọi).
// Giá trị mặc định chỉ dùng khi chạy tay trên máy; trong docker-compose các biến này đã được đặt sẵn.

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** DEV_FAMILY_IDS="1,2": bỏ qua genealogy-service khi phát triển (bị bỏ qua nếu NODE_ENV=production). */
const toIdList = (value) => [...new Set(String(value ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s)))];

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? 'development';
  return Object.freeze({
    env: nodeEnv,
    port: toInt(env.PORT, 3003),
    databaseUrl: env.DATABASE_URL ?? 'postgres://community_svc:community_dev_pw@localhost:5432/community_db',
    genealogyUrl: env.GENEALOGY_URL ?? 'http://localhost:3002',
    serviceTimeoutMs: toInt(env.SERVICE_TIMEOUT_MS, 3000),
    membershipCacheMs: toInt(env.MEMBERSHIP_CACHE_MS, 60000),
    devFamilyIds: nodeEnv === 'production' ? [] : toIdList(env.DEV_FAMILY_IDS),
  });
}

export const config = loadConfig();
