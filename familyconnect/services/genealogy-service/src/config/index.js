const port = Number(process.env.PORT || 3002);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

function serviceUrl(value, fallback) {
    return (value || fallback).replace(/\/+$/, '');
}

const config = Object.freeze({
    port,
    databaseUrl: process.env.DATABASE_URL
        || 'postgres://genealogy_svc:genealogy_dev_pw@localhost:5432/genealogy_db',
    authUrl: serviceUrl(process.env.AUTH_URL, 'http://localhost:3001'),
    reportUrl: serviceUrl(process.env.REPORT_URL, 'http://localhost:3007'),
});

export default config;
