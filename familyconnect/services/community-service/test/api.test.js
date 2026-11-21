// Kiểm thử API community-service (FMLCN-46 + FMLCN-47).
// Chỉ chạy khi có TEST_DATABASE_URL trỏ tới database THẬT dành riêng cho test
// (bảng post/comment/reaction sẽ bị xóa và tạo lại):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/community_test npm test
//
// genealogy-service và report-service được thay bằng server giả trong cùng tiến trình,
// nên test không cần Docker và không phụ thuộc service của người khác.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import pg from 'pg';

const DB_URL = process.env.TEST_DATABASE_URL;
const skip = DB_URL ? false : 'đặt TEST_DATABASE_URL để chạy kiểm thử với PostgreSQL';
const SCHEMA_FILE = fileURLToPath(new URL('../../../db/init/30-community.sql', import.meta.url));

// Người dùng giả: id -> các dòng họ mà genealogy-service "xác nhận" là thành viên.
const MEMBERSHIPS = {
    5: [{ family_id: '1', member_id: '1', is_verified: true }],
    6: [{ family_id: '1', member_id: '2', is_verified: true }],
    7: [{ family_id: '2', member_id: '3', is_verified: true }],
    8: [{ family_id: '1', member_id: '4', is_verified: false }],
};

const AUTHOR = { 'X-User-Id': '5', 'X-User-Role': 'FAMILY_MEMBER' };
const MEMBER2 = { 'X-User-Id': '6', 'X-User-Role': 'FAMILY_MEMBER' };
const OUTSIDER = { 'X-User-Id': '7', 'X-User-Role': 'FAMILY_MEMBER' };
const ADMIN = { 'X-User-Id': '9', 'X-User-Role': 'SYSTEM_ADMIN' };
const GUEST = { 'X-User-Id': '5', 'X-User-Role': 'GUEST' };

let db;
let app;
let base;
let stub;
let auditEvents = [];
let postId;
let commentId;
let reactionId;

/** Gọi API và trả về { status, json, headers }. */
async function api(method, path, { headers = AUTHOR, body, rawBody } = {}) {
    const hasBody = body !== undefined || rawBody !== undefined;
    const res = await fetch(base + path, {
        method,
        headers: { ...headers, ...(hasBody ? { 'content-type': 'application/json' } : {}) },
        body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* có test riêng cho body không phải JSON */ }
    return { status: res.status, json, headers: res.headers };
}

/** Mọi response (kể cả lỗi) phải theo khuôn { success, status_code, message, data }. */
function assertEnvelope(r) {
    assert.equal(typeof r.json?.success, 'boolean', 'thiếu success');
    assert.equal(r.json.status_code, r.status, 'status_code phải bằng mã HTTP');
    assert.equal(typeof r.json.message, 'string', 'message phải là chuỗi');
    assert.ok('data' in r.json, 'thiếu data');
}

before(async () => {
    if (skip) return;

    // 1. Database test: nạp lại schema của service (bỏ dòng \connect của psql).
    db = new pg.Client({ connectionString: DB_URL });
    await db.connect();
    const schema = readFileSync(SCHEMA_FILE, 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/^\s*\\connect.*$/gm, '');
    await db.query('DROP TABLE IF EXISTS reaction, comment, post CASCADE');
    await db.query(schema);

    // 2. Service giả: genealogy trả membership, report nhận sự kiện audit.
    stub = createServer((req, res) => {
        const url = new URL(req.url, 'http://stub');
        if (url.pathname === '/internal/memberships') {
            const userId = url.searchParams.get('user_id');
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                status_code: 200,
                message: 'OK',
                data: { user_id: userId, memberships: MEMBERSHIPS[userId] ?? [] },
            }));
            return;
        }
        if (url.pathname === '/internal/audit' && req.method === 'POST') {
            let raw = '';
            req.on('data', (chunk) => { raw += chunk; });
            req.on('end', () => {
                auditEvents.push(JSON.parse(raw));
                res.writeHead(202, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ success: true, status_code: 202, message: 'Accepted', data: null }));
            });
            return;
        }
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ success: false, status_code: 404, message: 'Not found', data: { code: 'NOT_FOUND' } }));
    });
    await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
    const stubUrl = `http://127.0.0.1:${stub.address().port}`;

    // 3. Nạp app sau khi đã đặt biến môi trường (config đọc process.env lúc import).
    process.env.DATABASE_URL = DB_URL;
    process.env.GENEALOGY_URL = stubUrl;
    process.env.REPORT_URL = stubUrl;
    const { default: expressApp } = await import('../src/app.js');
    app = expressApp.listen(0, '127.0.0.1');
    await new Promise((resolve) => app.once('listening', resolve));
    base = `http://127.0.0.1:${app.address().port}`;
});

after(async () => {
    if (skip) return;
    if (app) await new Promise((resolve) => app.close(resolve));
    if (stub) await new Promise((resolve) => stub.close(resolve));
    if (db) await db.end();
});

test('GET /health -> 200 UP', { skip }, async () => {
    const r = await api('GET', '/health', { headers: {} });
    assert.equal(r.status, 200);
    assertEnvelope(r);
    assert.equal(r.json.data.service, 'community-service');
    assert.equal(r.json.data.status, 'UP');
});

test('thiếu danh tính -> 401, vai trò GUEST -> 403', { skip }, async () => {
    const anonymous = await api('GET', '/api/posts?family_id=1', { headers: {} });
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.json.data.code, 'UNAUTHENTICATED');
    assertEnvelope(anonymous);

    const guest = await api('GET', '/api/posts?family_id=1', { headers: GUEST });
    assert.equal(guest.status, 403);
    assert.equal(guest.json.data.code, 'FORBIDDEN');
    test('thành viên chưa xác minh (is_verified=false) -> 403', { skip }, async () => {
    const unverified = await api('GET', '/api/posts?family_id=1', {
        headers: { 'X-User-Id': '8', 'X-User-Role': 'FAMILY_MEMBER' },
    });
    assert.equal(unverified.status, 403, 'thành viên chưa xác minh phải bị chặn');
    assert.equal(unverified.json.data.code, 'FORBIDDEN');
});

test('GET /api/posts: bắt buộc family_id, chặn dòng họ không thuộc', { skip }, async () => {
    const missing = await api('GET', '/api/posts');
    assert.equal(missing.status, 400);
    assert.ok(missing.json.data.fields.family_id, 'thiếu fields.family_id');

    const bad = await api('GET', '/api/posts?family_id=abc');
    assert.equal(bad.status, 400);

    const own = await api('GET', '/api/posts?family_id=1');
    assert.equal(own.status, 200);
    assert.ok(Array.isArray(own.json.data));
    assert.notEqual(own.headers.get('x-total-count'), null, 'thiếu X-Total-Count');

    const other = await api('GET', '/api/posts?family_id=2');
    assert.equal(other.status, 403, 'thành viên dòng họ khác phải bị chặn');

    const admin = await api('GET', '/api/posts?family_id=2', { headers: ADMIN });
    assert.equal(admin.status, 200, 'SYSTEM_ADMIN xem được mọi dòng họ');
});

test('POST /api/posts: validate, tạo bài, kiểm tra quyền theo dòng họ', { skip }, async () => {
    const badType = await api('POST', '/api/posts', { body: { family_id: '1', post_type: 'SPAM', content: 'x' } });
    assert.equal(badType.status, 400);
    assert.ok(badType.json.data.fields.post_type);

    const emptyContent = await api('POST', '/api/posts', { body: { family_id: '1', content: '   ' } });
    assert.equal(emptyContent.status, 400);
    assert.ok(emptyContent.json.data.fields.content);

    const forbidden = await api('POST', '/api/posts', { body: { family_id: '2', content: 'x' } });
    assert.equal(forbidden.status, 403);

    const brokenJson = await api('POST', '/api/posts', { rawBody: '{bad json' });
    assert.equal(brokenJson.status, 400);
    assert.equal(brokenJson.json.data.code, 'VALIDATION_ERROR');

    const created = await api('POST', '/api/posts', {
        body: { family_id: '1', post_type: 'NEWS', title: 'Họp mặt cuối năm', content: 'Mời cả nhà 20h thứ bảy.' },
    });
    assert.equal(created.status, 201);
    assertEnvelope(created);
    assert.equal(created.json.data.family_id, '1');
    assert.equal(created.json.data.post_type, 'NEWS');
    postId = created.json.data.post_id;
    assert.ok(postId, 'thiếu post_id');
});

test('GET/PATCH /api/posts/:id: 404 khi không có, chỉ tác giả được sửa', { skip }, async () => {
    const found = await api('GET', `/api/posts/${postId}`);
    assert.equal(found.status, 200);
    assert.equal(found.json.data.post_id, postId);

    const missing = await api('GET', '/api/posts/999999');
    assert.equal(missing.status, 404);
    assert.equal(missing.json.data.code, 'NOT_FOUND');

    const notAuthor = await api('PATCH', `/api/posts/${postId}`, { headers: MEMBER2, body: { content: 'sửa trộm' } });
    assert.equal(notAuthor.status, 403);

    const updated = await api('PATCH', `/api/posts/${postId}`, { body: { content: 'Mời cả nhà 19h thứ bảy.' } });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.data.content, 'Mời cả nhà 19h thứ bảy.');
});

test('POST/GET/DELETE /api/comments: tạo, liệt kê, chỉ tác giả được xóa', { skip }, async () => {
    const created = await api('POST', '/api/comments', { headers: MEMBER2, body: { post_id: postId, content: 'Em tham gia ạ.' } });
    assert.equal(created.status, 201);
    commentId = created.json.data.comment_id;
    assert.equal(created.json.data.post_id, postId);

    const missingPost = await api('POST', '/api/comments', { body: { post_id: '999999', content: 'x' } });
    assert.equal(missingPost.status, 404);

    const list = await api('GET', `/api/comments?post_id=${postId}`);
    assert.equal(list.status, 200);
    assert.equal(list.json.data.length, 1);
    assert.notEqual(list.headers.get('x-total-count'), null);

    const notAuthor = await api('DELETE', `/api/comments/${commentId}`, { headers: AUTHOR });
    assert.equal(notAuthor.status, 403);
});

test('POST /api/reactions: mỗi người một cảm xúc, thả lại là đổi loại (201 -> 200)', { skip }, async () => {
    const first = await api('POST', '/api/reactions', { body: { post_id: postId, reaction_type: 'LOVE' } });
    assert.equal(first.status, 201);
    assert.equal(first.json.data.reaction_type, 'LOVE');
    reactionId = first.json.data.reaction_id;

    const second = await api('POST', '/api/reactions', { body: { post_id: postId, reaction_type: 'LIKE' } });
    assert.equal(second.status, 200);
    assert.equal(second.json.data.reaction_id, reactionId, 'phải giữ nguyên reaction_id');
    assert.equal(second.json.data.reaction_type, 'LIKE');

    const invalid = await api('POST', '/api/reactions', { body: { post_id: postId, reaction_type: 'SMILE' } });
    assert.equal(invalid.status, 400);
    assert.ok(invalid.json.data.fields.reaction_type);

    const list = await api('GET', `/api/reactions?post_id=${postId}`);
    assert.equal(list.status, 200);
    assert.equal(list.json.data.length, 1);

    const notOwner = await api('DELETE', `/api/reactions/${reactionId}`, { headers: MEMBER2 });
    assert.equal(notOwner.status, 403);
});

test('POST /api/posts người ngoài dòng họ -> 403 (không đọc được dữ liệu dòng họ khác)', { skip }, async () => {
    const r = await api('POST', '/api/comments', {
        headers: OUTSIDER,
        body: { post_id: postId, content: 'bình luận trộm' },
    });
    assert.equal(r.status, 403);
});

test('GET /internal/stats: đúng dạng, lọc được theo family_id', { skip }, async () => {
    const scoped = await api('GET', '/internal/stats?family_id=1', { headers: {} });
    assert.equal(scoped.status, 200);
    for (const key of ['posts_count', 'comments_count', 'reactions_count', 'posts_by_type']) {
        assert.ok(key in scoped.json.data, `thiếu ${key}`);
    }
    for (const type of ['NEWS', 'ANNOUNCEMENT', 'GENERAL']) {
        assert.ok(type in scoped.json.data.posts_by_type, `thiếu posts_by_type.${type}`);
    }
    assert.equal(scoped.json.data.posts_count, 1);
    assert.equal(scoped.json.data.comments_count, 1);
    assert.equal(scoped.json.data.reactions_count, 1);
    assert.equal(scoped.json.data.posts_by_type.NEWS, 1);
    assert.equal(scoped.json.data.posts_by_type.GENERAL, 0);

    const global = await api('GET', '/internal/stats', { headers: {} });
    assert.equal(global.status, 200);
    assert.equal(global.json.data.posts_count, 1);

    const emptyFamily = await api('GET', '/internal/stats?family_id=2', { headers: {} });
    assert.equal(emptyFamily.status, 200);
    assert.equal(emptyFamily.json.data.posts_count, 0);
    assert.equal(emptyFamily.json.data.posts_by_type.GENERAL, 0);
});

test('GET /internal/activity: đúng dạng, validate family_id và limit', { skip }, async () => {
    const r = await api('GET', '/internal/activity?family_id=1&limit=5', { headers: {} });
    assert.equal(r.status, 200);
    assert.ok(r.json.data.length >= 2);
    for (const key of ['activity_type', 'user_id', 'entity_id', 'family_id', 'created_at']) {
        assert.ok(key in r.json.data[0], `thiếu ${key}`);
    }
    assert.ok(r.json.data.every((item) => ['POST_CREATED', 'COMMENT_CREATED'].includes(item.activity_type)));
    const times = r.json.data.map((item) => new Date(item.created_at).getTime());
    assert.deepEqual(times, [...times].sort((a, b) => b - a), 'phải sắp xếp mới nhất trước');

    const missing = await api('GET', '/internal/activity', { headers: {} });
    assert.equal(missing.status, 400);
    assert.ok(missing.json.data.fields.family_id);

    const tooBig = await api('GET', '/internal/activity?family_id=1&limit=99', { headers: {} });
    assert.equal(tooBig.status, 400);
    assert.ok(tooBig.json.data.fields.limit);
});

test('DELETE /api/posts/:id: chỉ tác giả, xóa kèm bình luận và cảm xúc', { skip }, async () => {
    const notAuthor = await api('DELETE', `/api/posts/${postId}`, { headers: MEMBER2 });
    assert.equal(notAuthor.status, 403);

    const deleted = await api('DELETE', `/api/posts/${postId}`);
    assert.equal(deleted.status, 200);
    assert.equal(deleted.json.data, null);

    const { rows } = await db.query(
        `SELECT (SELECT COUNT(*)::int FROM comment WHERE post_id = $1) AS comments,
                (SELECT COUNT(*)::int FROM reaction WHERE post_id = $1) AS reactions,
                (SELECT COUNT(*)::int FROM post WHERE post_id = $1) AS posts`,
        [postId],
    );
    assert.deepEqual(rows[0], { comments: 0, reactions: 0, posts: 0 });
});

test('mỗi thao tác ghi đều gửi sự kiện audit sang report-service', { skip }, async () => {
    // AuditClient gửi không chờ kết quả, nên đợi một nhịp trước khi kiểm tra.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const actions = auditEvents.map((event) => `${event.action} ${event.entity_type}`);
    for (const expected of ['CREATE POST', 'UPDATE POST', 'CREATE COMMENT', 'CREATE REACTION', 'DELETE POST']) {
        assert.ok(actions.includes(expected), `thiếu sự kiện ${expected} (đã có: ${actions.join(', ')})`);
    }
});

test('route không tồn tại -> 404 theo khuôn chung', { skip }, async () => {
    const r = await api('GET', '/api/khong-co');
    assert.equal(r.status, 404);
    assertEnvelope(r);
    assert.equal(r.json.success, false);
});
