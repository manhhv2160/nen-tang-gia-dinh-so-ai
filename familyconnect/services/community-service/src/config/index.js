// Đọc biến môi trường (PORT, DATABASE_URL, địa chỉ các service cần gọi)
const port = Number(process.env.PORT || 3003);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

function serviceUrl(value, fallback) {
    return (value || fallback).replace(/\/+$/, '');
}

const config = Object.freeze({
    port,
    databaseUrl: process.env.DATABASE_URL
        || 'postgres://community_svc:community_dev_pw@localhost:5432/community_db',
    genealogyUrl: serviceUrl(process.env.GENEALOGY_URL, 'http://localhost:3002'),
    reportUrl: serviceUrl(process.env.REPORT_URL, 'http://localhost:3007'),
});

export default config;// Đọc biến môi trường (PORT, DATABASE_URL, địa chỉ các service cần gọi)
