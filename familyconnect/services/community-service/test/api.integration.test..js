// Kiểm thử gọi API thật trên PostgreSQL. Chỉ chạy khi có biến TEST_DATABASE_URL (database THỬ, bảng sẽ bị xóa và tạo lại):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/community_test npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { compose } from '../src/compose.js';

const DB_URL = process.env.TEST_DATABASE_URL;
const skip = DB_URL ? false : 'đặt TEST_DATABASE_URL để chạy kiểm thử với PostgreSQL';

// Người dùng giả: id -> { vai trò, các dòng họ }
const USERS = {
  1: { role: 'SYSTEM_ADMIN', families: [] },
  2: { role: 'FAMILY_ADMIN', families: ['1'] },
  3: { role: 'FAMILY_MEMBER', families: ['1'] },
  4: { role: 'FAMILY_MEMBER', families: ['2'] },
  5: { role: 'GUEST', families: [] },
  6: { role: 'FAMILY_MEMBER', families: ['1', '2'] },
};
const genealogyClient = { getFamilyIds: async (user) => USERS[user.userId]?.families ?? [] };
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

let pool; let server; let base; let auditServer; let auditBase;
const audit = { events: [], record(e) { this.events.push(e); } };

async function call(method, path, { as, body, raw, origin = base } = {}) {
  const headers = {};
  if (as) { headers['X-User-Id'] = String(as); headers['X-User-Role'] = USERS[as].role; }
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${origin}${path}`, { method, headers, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const json = await res.json();
  assert.equal(typeof json.success, 'boolean', 'response phải đúng khuôn chung');
  assert.equal(json.status_code, res.status);
  assert.equal(typeof json.message, 'string');
  assert.ok(json.data === null || typeof json.data === 'object', 'data là đối tượng, mảng hoặc null');
  assert.equal(json.success, res.status < 300);
  if (!json.success) assert.equal(typeof json.data.code, 'string', 'response lỗi phải có data.code');
  return { status: res.status, total: res.headers.get('x-total-count'), ...json };
}
const errCode = (r) => r.data?.code;

before(async () => {
  if (skip) return;
  pool = new pg.Pool({ connectionString: DB_URL });
  const sql = readFileSync(fileURLToPath(new URL('../../../db/init/30-community.sql', import.meta.url)), 'utf8')
    .split('\n').filter((line) => !line.trim().startsWith('\\connect')).join('\n');
  await pool.query('DROP TABLE IF EXISTS reaction, comment, post CASCADE');
  await pool.query(sql);
  await new Promise((resolve) => { server = compose({ pool, genealogyClient }).express.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  await new Promise((resolve) => { auditServer = compose({ pool, genealogyClient, audit }).express.listen(0, '127.0.0.1', resolve); });
  auditBase = `http://127.0.0.1:${auditServer.address().port}`;
});

after(async () => {
  if (skip) return;
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => auditServer.close(resolve));
  await pool.end();
});

test('GET /health: { service, status: "UP" }', { skip }, async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { service: 'community-service', status: 'UP' });
});

test('đăng nhập và vai trò: 401 UNAUTHENTICATED khi thiếu danh tính, 403 FORBIDDEN với GUEST', { skip }, async () => {
  const none = await call('GET', '/api/posts?family_id=1');
  assert.deepEqual([none.status, errCode(none)], [401, 'UNAUTHENTICATED']);
  const guest = await call('GET', '/api/posts?family_id=1', { as: 5 });
  assert.deepEqual([guest.status, errCode(guest)], [403, 'FORBIDDEN']);
  assert.equal((await call('POST', '/api/posts', { as: 5, body: { family_id: '1', content: 'x' } })).status, 403);
});

let postId; let postByAdminId; let commentId; let reactionId;

test('POST /posts: thành viên đăng bài, mặc định GENERAL, dữ liệu được làm sạch', { skip }, async () => {
  const r = await call('POST', '/api/posts', { as: 3, body: { family_id: '1', title: '  Họp mặt  ', content: '  Cuối tuần này  ' } });
  assert.equal(r.status, 201);
  assert.equal(r.message, 'Created');
  assert.deepEqual(Object.keys(r.data), ['post_id', 'family_id', 'user_id', 'post_type', 'title', 'content', 'comment_count', 'reaction_counts', 'my_reaction', 'created_at', 'updated_at']);
  assert.equal(r.data.family_id, '1');
  assert.equal(r.data.user_id, '3');
  assert.equal(r.data.post_type, 'GENERAL');
  assert.equal(r.data.title, 'Họp mặt');
  assert.equal(r.data.content, 'Cuối tuần này');
  assert.match(r.data.post_id, /^\d+$/);
  assert.equal(r.data.comment_count, 0);
  assert.deepEqual(r.data.reaction_counts, {});
  assert.equal(r.data.my_reaction, null);
  assert.match(r.data.created_at, ISO, 'thời gian ISO 8601 UTC có mili giây');
  postId = r.data.post_id;

  const noTitle = await call('POST', '/api/posts', { as: 3, body: { family_id: '1', content: 'Không tiêu đề', post_type: 'NEWS' } });
  assert.equal(noTitle.data.title, null, 'trường rỗng trả null, không bỏ khỏi JSON');
  assert.equal(noTitle.data.post_type, 'NEWS');
});

test('POST /posts: quản trị đăng thông báo; thành viên cũng đăng được mọi loại (hợp đồng không hạn chế)', { skip }, async () => {
  const r = await call('POST', '/api/posts', { as: 2, body: { family_id: '1', post_type: 'ANNOUNCEMENT', title: 'Giỗ tổ', content: 'Ngày 20/11' } });
  assert.equal(r.status, 201);
  postByAdminId = r.data.post_id;
  assert.equal((await call('POST', '/api/posts', { as: 3, body: { family_id: '1', post_type: 'ANNOUNCEMENT', content: 'x' } })).status, 201);
});

test('POST /posts: 400 VALIDATION_ERROR kèm fields cho từng trường sai', { skip }, async () => {
  const none = await call('POST', '/api/posts', { as: 3, body: {} });
  assert.equal(none.status, 400);
  assert.equal(none.message, 'Validation failed');
  assert.deepEqual(none.data, { code: 'VALIDATION_ERROR', fields: { family_id: 'required', content: 'required' } });
  const many = await call('POST', '/api/posts', { as: 3, body: { family_id: 'abc', content: 'a'.repeat(10001), post_type: 'KHAC', title: 't'.repeat(256) } });
  assert.deepEqual(Object.keys(many.data.fields).sort(), ['content', 'family_id', 'post_type', 'title']);
  assert.equal((await call('POST', '/api/posts', { as: 3, body: { family_id: '1', content: '   ' } })).data.fields.content, 'required');
  const bad = await call('POST', '/api/posts', { as: 3, raw: '{không phải json' });
  assert.deepEqual([bad.status, errCode(bad), bad.data.fields.body], [400, 'VALIDATION_ERROR', 'invalid JSON']);
  assert.equal((await call('POST', '/api/posts', { as: 3, body: [1, 2] })).status, 400);
  const big = await call('POST', '/api/posts', { as: 3, body: { family_id: '1', content: 'x'.repeat(200000) } });
  assert.deepEqual([big.status, errCode(big)], [413, 'PAYLOAD_TOO_LARGE']);
});

test('dòng họ: không thuộc dòng họ thì 403, SYSTEM_ADMIN vào mọi dòng họ', { skip }, async () => {
  assert.equal((await call('GET', `/api/posts/${postId}`, { as: 4 })).status, 403);
  assert.equal((await call('GET', '/api/posts?family_id=1', { as: 4 })).status, 403);
  assert.equal((await call('POST', '/api/posts', { as: 4, body: { family_id: '1', content: 'xâm nhập' } })).status, 403);
  assert.equal((await call('POST', '/api/posts', { as: 6, body: { family_id: '2', content: 'họ 2' } })).status, 201);
  assert.equal((await call('POST', '/api/posts', { as: 1, body: { family_id: '3', content: 'admin hệ thống' } })).status, 201);
  assert.equal((await call('GET', '/api/posts?family_id=3', { as: 1 })).status, 200);
});

test('GET /posts: family_id bắt buộc, lọc, sắp xếp, phân trang, X-Total-Count', { skip }, async () => {
  const none = await call('GET', '/api/posts', { as: 3 });
  assert.deepEqual([none.status, none.data.fields.family_id], [400, 'required']);

  const all = await call('GET', '/api/posts?family_id=1', { as: 3 });
  assert.equal(all.status, 200);
  assert.ok(Array.isArray(all.data));
  assert.ok(all.data.every((p) => p.family_id === '1'));
  assert.equal(Number(all.total), all.data.length);
  assert.ok(all.data.length >= 4);
  const desc = all.data.map((p) => p.post_id);
  assert.deepEqual(desc, [...desc].sort((a, b) => Number(b) - Number(a)), 'mặc định mới nhất trước (-created_at)');
  const asc = await call('GET', '/api/posts?family_id=1&sort=created_at', { as: 3 });
  assert.deepEqual(asc.data.map((p) => p.post_id), [...desc].reverse());

  const types = await call('GET', '/api/posts?family_id=1&post_type=ANNOUNCEMENT', { as: 3 });
  assert.ok(types.data.length >= 1 && types.data.every((p) => p.post_type === 'ANNOUNCEMENT'));
  const mine = await call('GET', '/api/posts?family_id=1&user_id=2', { as: 3 });
  assert.ok(mine.data.length >= 1 && mine.data.every((p) => p.user_id === '2'));

  const page = await call('GET', '/api/posts?family_id=1&limit=2&offset=1', { as: 3 });
  assert.equal(page.data.length, 2);
  assert.equal(page.total, all.total, 'X-Total-Count là tổng khớp bộ lọc, không phụ thuộc phân trang');
  assert.deepEqual(page.data.map((p) => p.post_id), desc.slice(1, 3));
  assert.equal((await call('GET', '/api/posts?family_id=1&limit=1000', { as: 3 })).status, 200, 'limit lớn hơn 100 bị cắt xuống 100');

  const other = await call('GET', '/api/posts?family_id=2', { as: 4 });
  assert.ok(other.data.length >= 1 && other.data.every((p) => p.family_id === '2'));

  for (const q of ['limit=abc', 'limit=0', 'offset=-1', 'sort=content', 'post_type=KHAC', 'user_id=x']) {
    assert.equal((await call('GET', `/api/posts?family_id=1&${q}`, { as: 3 })).status, 400, q);
  }
  assert.equal((await call('GET', '/api/posts?family_id=1&tham_so_la=1', { as: 3 })).status, 200, 'tham số lạ bị bỏ qua');
});

test('GET /posts/:id: id sai hoặc không tồn tại', { skip }, async () => {
  assert.equal((await call('GET', `/api/posts/${postId}`, { as: 3 })).data.post_id, postId);
  assert.deepEqual([(await call('GET', '/api/posts/abc', { as: 3 })).status, (await call('GET', '/api/posts/999999999', { as: 3 })).status], [400, 404]);
  const nf = await call('GET', '/api/khong-co', { as: 3 });
  assert.deepEqual([nf.status, errCode(nf)], [404, 'NOT_FOUND']);
});

test('POST /comments: thành viên cùng dòng họ viết bình luận, kiểm tra 400, 403, 404', { skip }, async () => {
  const r = await call('POST', '/api/comments', { as: 2, body: { post_id: postId, content: ' Gia đình mình sẽ về ' } });
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.data), ['comment_id', 'post_id', 'user_id', 'content', 'created_at', 'updated_at']);
  assert.equal(r.data.content, 'Gia đình mình sẽ về');
  assert.equal(r.data.user_id, '2');
  commentId = r.data.comment_id;

  assert.equal((await call('POST', '/api/comments', { as: 3, body: { post_id: postId, content: 'c'.repeat(10000) } })).status, 201);
  assert.equal((await call('POST', '/api/comments', { as: 3, body: { post_id: postId, content: 'c'.repeat(10001) } })).status, 400);
  assert.deepEqual((await call('POST', '/api/comments', { as: 3, body: {} })).data.fields, { post_id: 'required', content: 'required' });
  assert.equal((await call('POST', '/api/comments', { as: 4, body: { post_id: postId, content: 'xâm nhập' } })).status, 403);
  assert.equal((await call('POST', '/api/comments', { as: 3, body: { post_id: '999999999', content: 'x' } })).status, 404);
});

test('GET /comments: bắt buộc post_id, mặc định cũ nhất trước, phân trang', { skip }, async () => {
  const list = await call('GET', `/api/comments?post_id=${postId}`, { as: 3 });
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 2);
  assert.equal(list.total, '2');
  assert.deepEqual(list.data.map((c) => c.comment_id), [...list.data.map((c) => c.comment_id)].sort((a, b) => Number(a) - Number(b)));
  const desc = await call('GET', `/api/comments?post_id=${postId}&sort=-created_at`, { as: 3 });
  assert.deepEqual(desc.data.map((c) => c.comment_id), [...list.data.map((c) => c.comment_id)].reverse());
  assert.equal((await call('GET', `/api/comments?post_id=${postId}&limit=1`, { as: 3 })).data.length, 1);
  assert.equal((await call('GET', '/api/comments', { as: 3 })).data.fields.post_id, 'required');
  assert.equal((await call('GET', `/api/comments?post_id=${postId}`, { as: 4 })).status, 403);
  assert.equal((await call('GET', '/api/comments?post_id=999999999', { as: 3 })).status, 404);
  const post = await call('GET', `/api/posts/${postId}`, { as: 3 });
  assert.equal(post.data.comment_count, 2);
});

test('PATCH và DELETE /comments: chính tác giả sửa, tác giả hoặc quản trị dòng họ xóa', { skip }, async () => {
  assert.equal((await call('PATCH', `/api/comments/${commentId}`, { as: 3, body: { content: 'sửa hộ' } })).status, 403);
  assert.equal((await call('PATCH', `/api/comments/${commentId}`, { as: 3, body: { content: 'sửa hộ' } })).data.code, 'FORBIDDEN');
  const edited = await call('PATCH', `/api/comments/${commentId}`, { as: 2, body: { content: 'Đã sửa' } });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.content, 'Đã sửa');
  assert.equal((await call('PATCH', `/api/comments/${commentId}`, { as: 2, body: { content: '' } })).status, 400);
  assert.equal((await call('PATCH', `/api/comments/${commentId}`, { as: 1, body: { content: 'admin hệ thống sửa' } })).status, 200, 'SYSTEM_ADMIN được phép mọi thao tác');

  const c2 = await call('POST', '/api/comments', { as: 3, body: { post_id: postId, content: 'của thành viên' } });
  assert.equal((await call('DELETE', `/api/comments/${c2.data.comment_id}`, { as: 6 })).status, 403, 'thành viên khác không xóa được');
  const byAdmin = await call('DELETE', `/api/comments/${c2.data.comment_id}`, { as: 2 });
  assert.deepEqual([byAdmin.status, byAdmin.data], [200, null], 'quản trị dòng họ kiểm duyệt, data là null');
  const c3 = await call('POST', '/api/comments', { as: 3, body: { post_id: postId, content: 'tự xóa' } });
  assert.equal((await call('DELETE', `/api/comments/${c3.data.comment_id}`, { as: 3 })).status, 200, 'tác giả tự xóa');
  assert.equal((await call('DELETE', `/api/comments/${c3.data.comment_id}`, { as: 3 })).status, 404);
  assert.equal((await call('DELETE', '/api/comments/abc', { as: 3 })).status, 400);
});

test('POST /reactions: mặc định LIKE, mỗi người một cảm xúc cho mỗi bài, thả lại thì đổi loại', { skip }, async () => {
  const first = await call('POST', '/api/reactions', { as: 3, body: { post_id: postId } });
  assert.equal(first.status, 201);
  assert.equal(first.data.reaction_type, 'LIKE', 'reaction_type mặc định LIKE');
  assert.deepEqual(Object.keys(first.data), ['reaction_id', 'post_id', 'user_id', 'reaction_type', 'created_at', 'updated_at']);
  reactionId = first.data.reaction_id;

  const again = await call('POST', '/api/reactions', { as: 3, body: { post_id: postId, reaction_type: 'LOVE' } });
  assert.equal(again.status, 200, 'đổi loại, không thêm mới');
  assert.equal(again.data.reaction_id, reactionId);
  assert.equal(again.data.reaction_type, 'LOVE');

  assert.equal((await call('POST', '/api/reactions', { as: 2, body: { post_id: postId, reaction_type: 'LIKE' } })).status, 201);
  assert.equal((await call('POST', '/api/reactions', { as: 3, body: { post_id: postId, reaction_type: 'KHAC' } })).data.fields.reaction_type, 'must be one of LIKE, LOVE, HAHA, WOW, SAD, ANGRY');
  assert.equal((await call('POST', '/api/reactions', { as: 3, body: {} })).data.fields.post_id, 'required');
  assert.equal((await call('POST', '/api/reactions', { as: 4, body: { post_id: postId } })).status, 403);
  assert.equal((await call('POST', '/api/reactions', { as: 3, body: { post_id: '999999999' } })).status, 404);

  const list = await call('GET', `/api/reactions?post_id=${postId}`, { as: 3 });
  assert.equal(list.data.length, 2);
  assert.equal(list.total, '2');
  assert.equal((await call('GET', '/api/reactions', { as: 3 })).data.fields.post_id, 'required');
  assert.equal((await call('GET', `/api/reactions?post_id=${postId}`, { as: 4 })).status, 403);

  const post = await call('GET', `/api/posts/${postId}`, { as: 3 });
  assert.deepEqual(post.data.reaction_counts, { LIKE: 1, LOVE: 1 });
  assert.equal(post.data.my_reaction.reaction_id, reactionId);
  assert.equal(post.data.my_reaction.reaction_type, 'LOVE');
  assert.match(post.data.my_reaction.created_at, ISO);
});

test('DELETE /reactions/:id: chính người thả (hoặc SYSTEM_ADMIN)', { skip }, async () => {
  assert.equal((await call('DELETE', `/api/reactions/${reactionId}`, { as: 2 })).status, 403);
  const own = await call('DELETE', `/api/reactions/${reactionId}`, { as: 3 });
  assert.deepEqual([own.status, own.data], [200, null]);
  assert.equal((await call('DELETE', `/api/reactions/${reactionId}`, { as: 3 })).status, 404);
  const post = await call('GET', `/api/posts/${postId}`, { as: 3 });
  assert.equal(post.data.my_reaction, null);
  assert.deepEqual(post.data.reaction_counts, { LIKE: 1 });
  const adminLike = (await call('GET', `/api/reactions?post_id=${postId}`, { as: 3 })).data[0];
  assert.equal((await call('DELETE', `/api/reactions/${adminLike.reaction_id}`, { as: 1 })).status, 200, 'SYSTEM_ADMIN được phép mọi thao tác');
});

test('PATCH /posts/:id: chính tác giả; null xóa tiêu đề; không có trường nào thì giữ nguyên', { skip }, async () => {
  assert.equal((await call('PATCH', `/api/posts/${postId}`, { as: 6, body: { content: 'người khác sửa' } })).status, 403);
  assert.equal((await call('PATCH', `/api/posts/${postId}`, { as: 2, body: { content: 'quản trị sửa bài người khác' } })).status, 403, 'FAMILY_ADMIN không phải chính tác giả');
  const own = await call('PATCH', `/api/posts/${postId}`, { as: 3, body: { content: 'Đã sửa nội dung', title: null } });
  assert.equal(own.status, 200);
  assert.equal(own.data.content, 'Đã sửa nội dung');
  assert.equal(own.data.title, null);
  assert.ok(new Date(own.data.updated_at) >= new Date(own.data.created_at));
  assert.equal((await call('PATCH', `/api/posts/${postId}`, { as: 3, body: { post_type: 'NEWS' } })).data.post_type, 'NEWS');
  const unchanged = await call('PATCH', `/api/posts/${postId}`, { as: 3, body: { family_id: '2', user_id: '9', ten_la: 1 } });
  assert.equal(unchanged.status, 200);
  assert.equal(unchanged.data.family_id, '1', 'trường không được sửa bị bỏ qua');
  assert.equal(unchanged.data.user_id, '3');
  assert.deepEqual((await call('PATCH', `/api/posts/${postId}`, { as: 3, body: { content: '' } })).data.fields, { content: 'required' });
  assert.equal((await call('PATCH', `/api/posts/${postId}`, { as: 3, body: { post_type: 'KHAC' } })).status, 400);
  assert.equal((await call('PATCH', `/api/posts/${postId}`, { as: 1, body: { title: 'admin hệ thống sửa' } })).status, 200);
  assert.equal((await call('PATCH', '/api/posts/999999999', { as: 3, body: { title: 'x' } })).status, 404);
});

test('DELETE /posts/:id: tác giả hoặc quản trị dòng họ, xóa kèm bình luận và cảm xúc, data là null', { skip }, async () => {
  assert.equal((await call('DELETE', `/api/posts/${postId}`, { as: 6 })).status, 403);
  assert.equal((await call('DELETE', `/api/posts/${postByAdminId}`, { as: 3 })).status, 403);
  const byAdmin = await call('DELETE', `/api/posts/${postByAdminId}`, { as: 2 });
  assert.deepEqual([byAdmin.status, byAdmin.data, byAdmin.message], [200, null, 'Deleted']);
  await call('POST', '/api/reactions', { as: 3, body: { post_id: postId, reaction_type: 'WOW' } });
  assert.equal((await call('DELETE', `/api/posts/${postId}`, { as: 3 })).status, 200, 'tác giả tự xóa');
  assert.equal((await call('GET', `/api/posts/${postId}`, { as: 3 })).status, 404);
  assert.equal((await call('GET', `/api/comments?post_id=${postId}`, { as: 3 })).status, 404, 'bình luận biến mất cùng bài');
  const left = await pool.query('SELECT (SELECT COUNT(*) FROM comment WHERE post_id = $1)::int c, (SELECT COUNT(*) FROM reaction WHERE post_id = $1)::int r', [postId]);
  assert.deepEqual(left.rows[0], { c: 0, r: 0 }, 'xóa bài xóa luôn bình luận và cảm xúc');
});

test('nhật ký (thẻ 48): có audit thì mỗi thao tác tạo, sửa, xóa được ghi, không có audit thì không lỗi', { skip }, async () => {
  audit.events.length = 0;
  const p = await call('POST', '/api/posts', { as: 3, origin: auditBase, body: { family_id: '1', content: 'bài để thử nhật ký' } });
  await call('PATCH', `/api/posts/${p.data.post_id}`, { as: 3, origin: auditBase, body: { title: 'Mới' } });
  const c = await call('POST', '/api/comments', { as: 2, origin: auditBase, body: { post_id: p.data.post_id, content: 'bình luận' } });
  await call('PATCH', `/api/comments/${c.data.comment_id}`, { as: 2, origin: auditBase, body: { content: 'sửa' } });
  const r1 = await call('POST', '/api/reactions', { as: 2, origin: auditBase, body: { post_id: p.data.post_id } });
  await call('POST', '/api/reactions', { as: 2, origin: auditBase, body: { post_id: p.data.post_id, reaction_type: 'WOW' } });
  await call('DELETE', `/api/reactions/${r1.data.reaction_id}`, { as: 2, origin: auditBase });
  await call('DELETE', `/api/comments/${c.data.comment_id}`, { as: 2, origin: auditBase });
  await call('DELETE', `/api/posts/${p.data.post_id}`, { as: 3, origin: auditBase });
  await call('POST', '/api/posts', { as: 4, origin: auditBase, body: { family_id: '1', content: 'bị chặn' } });
  const got = audit.events.map((e) => `${e.action} ${e.entityType}`);
  assert.deepEqual(got, ['CREATE POST', 'UPDATE POST', 'CREATE COMMENT', 'UPDATE COMMENT', 'CREATE REACTION', 'UPDATE REACTION', 'DELETE REACTION', 'DELETE COMMENT', 'DELETE POST'],
    'thao tác bị từ chối (403) không được ghi');
  assert.deepEqual(audit.events[0], { userId: '3', action: 'CREATE', entityType: 'POST', entityId: p.data.post_id, familyId: '1' });
  assert.ok(audit.events.every((e) => e.familyId === '1' && /^\d+$/.test(e.entityId)));
  assert.equal(JSON.stringify(audit.events).includes('bài để thử nhật ký'), false, 'không đưa nội dung bài viết vào nhật ký');
});

test('ràng buộc CSDL: UNIQUE(post_id, user_id) và CHECK enum', { skip }, async () => {
  const p = await pool.query("INSERT INTO post (family_id, user_id, content) VALUES (1, 1, 'x') RETURNING post_id");
  const id = p.rows[0].post_id;
  await pool.query("INSERT INTO reaction (post_id, user_id, reaction_type) VALUES ($1, 9, 'LIKE')", [id]);
  await assert.rejects(pool.query("INSERT INTO reaction (post_id, user_id, reaction_type) VALUES ($1, 9, 'LOVE')", [id]), /uq_reaction_post_user/);
  await assert.rejects(pool.query("INSERT INTO reaction (post_id, user_id, reaction_type) VALUES ($1, 8, 'KHAC')", [id]), /check/i);
  await assert.rejects(pool.query("INSERT INTO post (family_id, user_id, post_type, content) VALUES (1, 1, 'KHAC', 'x')"), /check/i);
});