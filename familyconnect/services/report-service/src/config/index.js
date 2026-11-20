// Cấu hình từ biến môi trường
export const config = {
  port: Number(process.env.PORT || 3007),
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://report_svc:report_dev_pw@localhost:5432/report_db',
  // Gọi service khác: đồng bộ, timeout 3 giây 
  timeoutMs: Number(process.env.INTERNAL_TIMEOUT_MS || 3000),
  urls: {
    auth: process.env.AUTH_URL || 'http://localhost:3001',
    genealogy: process.env.GENEALOGY_URL || 'http://localhost:3002',
    community: process.env.COMMUNITY_URL || 'http://localhost:3003',
    event: process.env.EVENT_URL || 'http://localhost:3004',
    heritage: process.env.HERITAGE_URL || 'http://localhost:3005',
  },
};
