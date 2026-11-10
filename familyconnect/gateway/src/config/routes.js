// Bảng tiền tố đường dẫn -> service (xem docs/api-contract.md) và danh sách route công khai (login, register)
// Các API không cần kiểm tra đăng nhập (đăng ký, đăng nhập)
export const PUBLIC_ROUTES = [
    '/api/v1/auth/login',
    '/api/v1/auth/register'
];

// Bảng định tuyến (dựa theo docs/api-contract.md)
export const ROUTES = [
    { prefix: '/api/v1/auth', target: 'http://localhost:3001' },
    { prefix: '/api/v1/users', target: 'http://localhost:3001' },
    { prefix: '/api/v1/families', target: 'http://localhost:3002' },
    { prefix: '/api/v1/branches', target: 'http://localhost:3002' },
    { prefix: '/api/v1/members', target: 'http://localhost:3002' },
    { prefix: '/api/v1/relationships', target: 'http://localhost:3002' },
    { prefix: '/api/v1/marriages', target: 'http://localhost:3002' },
    { prefix: '/api/v1/tree', target: 'http://localhost:3002' },
    { prefix: '/api/v1/relation-query', target: 'http://localhost:3002' },
    { prefix: '/api/v1/posts', target: 'http://localhost:3003' },
    { prefix: '/api/v1/comments', target: 'http://localhost:3003' },
    { prefix: '/api/v1/reactions', target: 'http://localhost:3003' },
    { prefix: '/api/v1/events', target: 'http://localhost:3004' },
    { prefix: '/api/v1/rsvps', target: 'http://localhost:3004' },
    { prefix: '/api/v1/heritages', target: 'http://localhost:3005' },
    { prefix: '/api/v1/ai', target: 'http://localhost:3006' },
    { prefix: '/api/v1/dashboard', target: 'http://localhost:3007' },
    { prefix: '/api/v1/audit-logs', target: 'http://localhost:3007' },
    { prefix: '/api/v1/reports', target: 'http://localhost:3007' }
];

export const HEALTH_ROUTES = [
    { path: '/health/auth', target: process.env.AUTH_URL || 'http://localhost:3001' },
    { path: '/health/genealogy', target: process.env.GENEALOGY_URL || 'http://localhost:3002' },
    { path: '/health/community', target: process.env.COMMUNITY_URL || 'http://localhost:3003' },
    { path: '/health/event', target: process.env.EVENT_URL || 'http://localhost:3004' },
    { path: '/health/heritage', target: process.env.HERITAGE_URL || 'http://localhost:3005' },
    { path: '/health/ai', target: process.env.AI_URL || 'http://localhost:3006' },
    { path: '/health/report', target: process.env.REPORT_URL || 'http://localhost:3007' }
];