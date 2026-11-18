import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { Validator, parsePaging, parseSort, requireBody } from '../src/utils/validators.js';
import { extractFamilyIds, GenealogyClient } from '../src/clients/GenealogyClient.js';
import { FamilyAccess } from '../src/services/FamilyAccess.js';
import { loadConfig } from '../src/config/index.js';
import { PostTypes } from '../src/shared.js';

test('Validator.id: chỉ nhận chuỗi số nguyên dương trong giới hạn BIGINT', () => {
  const v = new Validator();
  assert.equal(v.id('12', 'a'), '12');
  assert.equal(v.id(' 007 ', 'b'), '7');
  assert.deepEqual(v.fields, {});
  for (const bad of ['abc', '0', '-1', '1.5', '9223372036854775808', '1e3']) {
    const w = new Validator();
    assert.equal(w.id(bad, 'id'), null, bad);
    assert.deepEqual(w.fields, { id: 'must be a numeric id' }, bad);
  }
  const missing = new Validator();
  missing.id(undefined, 'post_id'); missing.id('', 'family_id');
  assert.deepEqual(missing.fields, { post_id: 'required', family_id: 'required' });
  const optional = new Validator();
  assert.equal(optional.id(undefined, 'user_id', { required: false }), null);
  assert.deepEqual(optional.fields, {});
});

test('Validator.text: cắt khoảng trắng, chuỗi rỗng coi như thiếu, kiểm tra độ dài và kiểu', () => {
  const v = new Validator();
  assert.equal(v.text('  xin chào  ', 'content', { max: 20, required: true }), 'xin chào');
  assert.equal(v.text(undefined, 'title', { max: 5 }), null);
  assert.equal(v.text('   ', 'title', { max: 5 }), null);
  assert.deepEqual(v.fields, {});
  const w = new Validator();
  w.text('   ', 'content', { max: 5, required: true });
  w.text('quá dài', 'title', { max: 3 });
  w.text(123, 'bio', { max: 5 });
  assert.deepEqual(w.fields, { content: 'required', title: 'must be at most 3 characters', bio: 'must be a string' });
});

test('Validator.enumValue và done()', () => {
  const v = new Validator();
  assert.equal(v.enumValue('NEWS', 'post_type', PostTypes), 'NEWS');
  assert.equal(v.enumValue(undefined, 'post_type', PostTypes, { fallback: 'GENERAL' }), 'GENERAL');
  assert.equal(v.enumValue('KHAC', 'post_type', PostTypes), null);
  assert.equal(v.fields.post_type, 'must be one of NEWS, ANNOUNCEMENT, GENERAL');
  assert.throws(() => v.done(), (e) => e.statusCode === 400 && e.code === 'VALIDATION_ERROR' && Boolean(e.fields.post_type));
  assert.doesNotThrow(() => new Validator().done());
});

test('parsePaging: limit mặc định 50, tối đa 100 (vượt thì cắt), offset mặc định 0', () => {
  const v = new Validator();
  assert.deepEqual(parsePaging({}, v), { limit: 50, offset: 0 });
  assert.deepEqual(parsePaging({ limit: '5', offset: '10' }, v), { limit: 5, offset: 10 });
  assert.deepEqual(parsePaging({ limit: '500' }, v), { limit: 100, offset: 0 });
  assert.deepEqual(parsePaging({}, v, { defaultLimit: 20, maxLimit: 50 }), { limit: 20, offset: 0 });
  assert.deepEqual(v.fields, {});
  const bad = new Validator();
  parsePaging({ limit: '0', offset: '-1' }, bad);
  assert.deepEqual(Object.keys(bad.fields).sort(), ['limit', 'offset']);
  const abc = new Validator();
  parsePaging({ limit: 'abc' }, abc);
  assert.ok(abc.fields.limit);
});

test('parseSort: tăng dần, giảm dần với dấu trừ, chỉ nhận trường cho phép', () => {
  const v = new Validator();
  assert.deepEqual(parseSort(undefined, ['created_at'], '-created_at', v), { field: 'created_at', direction: 'DESC' });
  assert.deepEqual(parseSort('created_at', ['created_at'], '-created_at', v), { field: 'created_at', direction: 'ASC' });
  assert.deepEqual(parseSort('-created_at', ['created_at'], 'created_at', v), { field: 'created_at', direction: 'DESC' });
  assert.deepEqual(v.fields, {});
  parseSort('content', ['created_at'], '-created_at', v);
  assert.equal(v.fields.sort, 'must be one of created_at, -created_at');
});

test('requireBody: phải là đối tượng JSON', () => {
  assert.deepEqual(requireBody({ a: 1 }), { a: 1 });
  for (const bad of [null, undefined, [], 'x', 5]) {
    assert.throws(() => requireBody(bad), (e) => e.statusCode === 400 && e.fields.body === 'must be a JSON object');
  }
});

test('extractFamilyIds: đọc đúng dạng { user_id, memberships: [...] } của hợp đồng', () => {
  const data = { user_id: '3', memberships: [{ family_id: '1', member_id: '10', is_verified: true }, { family_id: '2', member_id: '11', is_verified: false }, { family_id: '1', member_id: '12', is_verified: true }] };
  assert.deepEqual(extractFamilyIds(data), ['1', '2']);
  assert.deepEqual(extractFamilyIds([{ family_id: 5 }]), ['5']);
  assert.deepEqual(extractFamilyIds({ memberships: [] }), []);
  assert.deepEqual(extractFamilyIds({}), []);
  assert.deepEqual(extractFamilyIds(null), []);
  assert.deepEqual(extractFamilyIds({ memberships: [{ family_id: 'abc' }, { nothing: 1 }, null] }), []);
});

test('GenealogyClient: devFamilyIds bỏ qua việc gọi service', async () => {
  const client = new GenealogyClient({ baseUrl: 'http://127.0.0.1:1', devFamilyIds: ['7'] });
  assert.deepEqual(await client.getFamilyIds({ userId: '1', role: 'FAMILY_MEMBER' }), ['7']);
});

test('GenealogyClient: lỗi kết nối trả 502 SERVICE_UNAVAILABLE', async () => {
  const client = new GenealogyClient({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 300 });
  await assert.rejects(client.getFamilyIds({ userId: '1', role: 'FAMILY_MEMBER' }), (e) => e.statusCode === 502 && e.code === 'SERVICE_UNAVAILABLE');
});

test('GenealogyClient: gọi đúng đường dẫn, lưu tạm 60 giây rồi gọi lại', async () => {
  let calls = 0; let seen = null;
  const server = http.createServer((req, res) => {
    calls += 1; seen = { url: req.url, uid: req.headers['x-user-id'], role: req.headers['x-user-role'] };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status_code: 200, message: 'OK', data: { user_id: '3', memberships: [{ family_id: '9', member_id: '1', is_verified: true }] } }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let clock = 1_000;
  const client = new GenealogyClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, cacheMs: 60000, now: () => clock });
  const user = { userId: '3', role: 'FAMILY_MEMBER' };
  assert.deepEqual(await client.getFamilyIds(user), ['9']);
  assert.equal(seen.url, '/internal/memberships?user_id=3');
  assert.deepEqual([seen.uid, seen.role], ['3', 'FAMILY_MEMBER']);
  clock += 59_000;
  await client.getFamilyIds(user);
  assert.equal(calls, 1, 'trong 60 giây dùng lại kết quả đã lưu');
  clock += 2_000;
  await client.getFamilyIds(user);
  assert.equal(calls, 2, 'hết 60 giây thì gọi lại');
  await client.getFamilyIds({ userId: '4', role: 'FAMILY_MEMBER' });
  assert.equal(calls, 3, 'mỗi người dùng một ô lưu riêng');
  server.close();
});

test('FamilyAccess: SYSTEM_ADMIN vào mọi dòng họ, FAMILY_ADMIN chỉ kiểm duyệt dòng họ của mình', async () => {
  const access = new FamilyAccess({ getFamilyIds: async (u) => (u.userId === '2' ? ['1'] : []) });
  const sysAdmin = { userId: '9', role: 'SYSTEM_ADMIN' };
  const admin = { userId: '2', role: 'FAMILY_ADMIN' };
  const member = { userId: '3', role: 'FAMILY_MEMBER' };
  assert.equal(await access.canAccess(sysAdmin, '99'), true);
  assert.equal(await access.canAccess(admin, '1'), true);
  assert.equal(await access.canAccess(admin, '2'), false);
  assert.equal(await access.canModerate(admin, '1'), true);
  assert.equal(await access.canModerate(admin, '2'), false);
  assert.equal(await access.canModerate(member, '1'), false);
  assert.equal(await access.canModerate(sysAdmin, '5'), true);
  await assert.rejects(access.assertCanAccess(admin, '2'), (e) => e.statusCode === 403 && e.code === 'FORBIDDEN');
});

test('config: giá trị mặc định, DEV_FAMILY_IDS bị bỏ qua khi NODE_ENV=production', () => {
  assert.deepEqual(loadConfig({ DEV_FAMILY_IDS: '1, 2,x,2' }).devFamilyIds, ['1', '2']);
  assert.deepEqual(loadConfig({ NODE_ENV: 'production', DEV_FAMILY_IDS: '1' }).devFamilyIds, []);
  const c = loadConfig({});
  assert.equal(c.port, 3003);
  assert.equal(c.serviceTimeoutMs, 3000);
  assert.equal(c.membershipCacheMs, 60000);
  assert.equal(loadConfig({ PORT: '4000' }).port, 4000);
});