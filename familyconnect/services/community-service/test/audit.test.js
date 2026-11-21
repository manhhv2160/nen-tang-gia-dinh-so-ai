// Kiểm thử nhật ký của community-service (FMLCN-48): sau mỗi thao tác ghi phải có đúng
// một sự kiện POST /internal/audit, gửi không chờ phản hồi và không ghi nội dung bài viết.
// Cần TEST_DATABASE_URL trỏ tới database THẬT dành riêng cho test:
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/community_test npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import pg from 'pg';

const DB_URL = process.env.TEST_DATABASE_URL;
const skip = DB_URL ? false : 'đặt TEST_DATABASE_URL để chạy kiểm thử với PostgreSQL';
const SCHEMA_FILE = fileURLToPath(new URL('../../../db/init/30-community.sql', import.meta.url));

const AUTHOR = { 'X-User-Id': '5', 'X-User-Role': 'FAMILY_MEMBER' };
const MEMBER2 = { 'X-User-Id': '6', 'X-User-Role': 'FAMILY_MEMBER' };
const MEMBERSHIPS = {
    5: [{ family_id: '1', member_id: '1', is_verified: true }],
    6: [{ family_id: '1', member_id: '2', is_verified: true }],
};

// report-service giả: ghi lại từng sự kiện nhận được, có thể cố tình chậm hoặc lỗi.
const report = {
    mode: 'ok',
    events: [],
    requests: 0,
    completed: 0,
    reset() {
        this.mode = 'ok';
        this.events = [];
        this.requests = 0;
        this.completed = 0;
    },
};

let db;
let app;
let base;
let stub;

async function api(method, path, { headers = AUTHOR, body } = {}) {
    const res = await fetch(base + path, {
        method,
        headers: { ...headers, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json();
    return { status: res.status, json };
}

/** Đợi tới khi điều kiện đúng (sự kiện audit gửi không chờ nên đến sau response). */
async function waitFor(predicate, label, timeoutMs = 3000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.fail(`hết thời gian chờ: ${label}`);
}

before(async () => {
    if (skip) return;

    db = new pg.Client({ connectionString: DB_URL });
    await db.connect();
    const schema = readFileSync(SCHEMA_FILE, 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/^\s*\\connect.*$/gm, '');
    await db.query('DROP TABLE IF EXISTS reaction, comment, post CASCADE');
    await db.query(schema);

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
            report.requests += 1;
            let raw = '';
            req.on('data', (chunk) => { raw += chunk; });
            req.on('end', () => {
                const delay = report.mode === 'slow' ? 1500 : 0;
                setTimeout(() => {
                    if (report.mode !== 'fail') {
                        try { report.events.push(JSON.parse(raw)); } catch { report.events.push({ raw }); }
                    }
                    report.completed += 1;
                    res.writeHead(report.mode === 'fail' ? 500 : 202, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({
                        success: report.mode !== 'fail',
                        status_code: report.mode === 'fail' ? 500 : 202,
                        message: report.mode === 'fail' ? 'Internal error' : 'Accepted',
                        data: null,
                    }));
                }, delay);
            });
            return;
        }
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ success: false, status_code: 404, message: 'Not found', data: { code: 'NOT_FOUND' } }));
    });
    await new Promise((resolve) => stub.listen(0, '127.0.0.1', resolve));
    const stubUrl = `http://127.0.0.1:${stub.address().port}`;

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

test('mỗi thao tác ghi tạo đúng một sự kiện audit với đủ trường', { skip }, async () => {
    report.reset();

    const post = await api('POST', '/api/posts', {
        body: { family_id: '1', post_type: 'GENERAL', content: 'Nội dung không được vào nhật ký' },
    });
    assert.equal(post.status, 201);
    const postId = post.json.data.post_id;

    const updated = await api('PATCH', `/api/posts/${postId}`, { body: { content: 'Đã sửa' } });
    assert.equal(updated.status, 200);

    const comment = await api('POST', '/api/comments', { headers: MEMBER2, body: { post_id: postId, content: 'Bình luận' } });
    assert.equal(comment.status, 201);
    const commentId = comment.json.data.comment_id;

    const commentUpdated = await api('PATCH', `/api/comments/${commentId}`, { headers: MEMBER2, body: { content: 'Bình luận đã sửa' } });
    assert.equal(commentUpdated.status, 200);

    const reaction = await api('POST', '/api/reactions', { body: { post_id: postId, reaction_type: 'LOVE' } });
    assert.equal(reaction.status, 201);
    const reactionId = reaction.json.data.reaction_id;

    const reactionChanged = await api('POST', '/api/reactions', { body: { post_id: postId, reaction_type: 'LIKE' } });
    assert.equal(reactionChanged.status, 200);

    const reactionRemoved = await api('DELETE', `/api/reactions/${reactionId}`);
    assert.equal(reactionRemoved.status, 200);

    const commentRemoved = await api('DELETE', `/api/comments/${commentId}`, { headers: MEMBER2 });
    assert.equal(commentRemoved.status, 200);

    const postRemoved = await api('DELETE', `/api/posts/${postId}`);
    assert.equal(postRemoved.status, 200);

    await waitFor(() => report.events.length === 9, 'đủ 9 sự kiện audit');

    const summary = report.events.map((event) => `${event.action} ${event.entity_type}`);
    assert.deepEqual(summary, [
        'CREATE POST',
        'UPDATE POST',
        'CREATE COMMENT',
        'UPDATE COMMENT',
        'CREATE REACTION',
        'UPDATE REACTION',
        'DELETE REACTION',
        'DELETE COMMENT',
        'DELETE POST',
    ]);

    for (const event of report.events) {
        assert.deepEqual(Object.keys(event).sort(), ['action', 'entity_id', 'entity_type', 'family_id', 'user_id']);
        assert.equal(event.family_id, '1');
        assert.ok(event.entity_id, 'entity_id không được rỗng');
        assert.equal(typeof event.action, 'string');
    }
    assert.deepEqual(
        report.events.map((event) => event.user_id),
        ['5', '5', '6', '6', '5', '5', '5', '6', '5'],
        'user_id phải là người thao tác',
    );

    // Không được đưa nội dung bài viết / bình luận vào nhật ký.
    const serialized = JSON.stringify(report.events);
    assert.ok(!serialized.includes('Nội dung không được vào nhật ký'));
    assert.ok(!serialized.includes('Bình luận đã sửa'));
});

test('thao tác bị từ chối hoặc lỗi thì không ghi nhật ký', { skip }, async () => {
    report.reset();

    const post = await api('POST', '/api/posts', { body: { family_id: '1', content: 'Bài của người 5' } });
    assert.equal(post.status, 201);
    const postId = post.json.data.post_id;
    await waitFor(() => report.events.length === 1, 'sự kiện tạo bài');

    const forbidden = await api('PATCH', `/api/posts/${postId}`, { headers: MEMBER2, body: { content: 'sửa trộm' } });
    assert.equal(forbidden.status, 403);

    const invalid = await api('POST', '/api/comments', { body: { post_id: postId, content: '   ' } });
    assert.equal(invalid.status, 400);

    const missing = await api('DELETE', '/api/posts/999999');
    assert.equal(missing.status, 404);

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(report.events.length, 1, 'chỉ có sự kiện của thao tác thành công');
});

test('gửi nhật ký không chờ report-service trả lời', { skip }, async () => {
    report.reset();
    report.mode = 'slow';

    const started = Date.now();
    const created = await api('POST', '/api/posts', { body: { family_id: '1', content: 'Kiểm tra không chờ' } });
    const elapsed = Date.now() - started;

    assert.equal(created.status, 201);
    assert.ok(elapsed < 1200, `response API quá chậm: ${elapsed}ms`);

    await waitFor(() => report.requests === 1, 'yêu cầu audit được gửi');
    assert.equal(report.completed, 0, 'response API không được chờ report-service trả lời');

    // Đợi report-service giả trả lời xong để không còn request treo khi kết thúc test.
    await waitFor(() => report.completed === 1, 'report-service giả trả lời xong');
});

test('report-service lỗi vẫn không làm hỏng thao tác ghi', { skip }, async () => {
    report.reset();
    report.mode = 'fail';

    const created = await api('POST', '/api/posts', { body: { family_id: '1', content: 'report đang lỗi' } });
    assert.equal(created.status, 201, 'API vẫn thành công khi nhật ký lỗi');

    const postId = created.json.data.post_id;
    const deleted = await api('DELETE', `/api/posts/${postId}`);
    assert.equal(deleted.status, 200);
    await waitFor(() => report.requests === 2, 'vẫn thử gửi nhật ký cho mỗi thao tác');
});
