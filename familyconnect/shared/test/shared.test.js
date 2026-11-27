import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { Roles, Enums, isValidEnum, roleAtLeast } from '../src/enums.js';
import { AppError, ErrorCodes } from '../src/AppError.js';
import { ApiResponse } from '../src/ApiResponse.js';
import { getUserContext, userContext } from '../src/userContext.js';
import { requireRole } from '../src/requireRole.js';
import { healthRoute, registerHealthRoute } from '../src/healthRoute.js';
import { callService } from '../src/httpClient.js';

/** res giả kiểu Express. */
function fakeRes() {
  return {
    statusCode: null, body: null, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
const reqWith = (id, role) => ({ headers: { ...(id !== undefined && { 'x-user-id': id }), ...(role !== undefined && { 'x-user-role': role }) } });

test('enums: đủ 8 nhóm và giá trị đúng hợp đồng', () => {
  assert.deepEqual(Object.keys(Enums), ['Roles', 'Gender', 'RelationshipTypes', 'MarriageStatus', 'PostTypes', 'ReactionTypes', 'RsvpStatus', 'HeritageTypes']);
  assert.deepEqual(Object.values(Enums.Roles), ['GUEST', 'FAMILY_MEMBER', 'FAMILY_ADMIN', 'SYSTEM_ADMIN']);
  assert.deepEqual(Object.values(Enums.PostTypes), ['NEWS', 'ANNOUNCEMENT', 'GENERAL']);
  assert.deepEqual(Object.values(Enums.ReactionTypes), ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']);
  assert.deepEqual(Object.values(Enums.HeritageTypes), ['HISTORICAL_DOC', 'STORY', 'OUTSTANDING_MEMBER', 'PHOTO']);
  assert.ok(Object.isFrozen(Enums.Roles));
});

test('enums: isValidEnum và roleAtLeast', () => {
  assert.equal(isValidEnum(Roles, 'FAMILY_ADMIN'), true);
  assert.equal(isValidEnum(Roles, 'ADMIN'), false);
  assert.equal(roleAtLeast('FAMILY_ADMIN', 'FAMILY_MEMBER'), true);
  assert.equal(roleAtLeast('FAMILY_MEMBER', 'FAMILY_ADMIN'), false);
  assert.equal(roleAtLeast('SYSTEM_ADMIN', 'SYSTEM_ADMIN'), true);
  assert.equal(roleAtLeast('constructor', 'GUEST'), false);
  assert.equal(roleAtLeast('GUEST', 'khong-co'), false);
});

test('AppError: code, fields và data của response lỗi', () => {
  const v = AppError.validation({ full_name: 'required' });
  assert.equal(v.statusCode, 400);
  assert.equal(v.code, ErrorCodes.VALIDATION_ERROR);
  assert.deepEqual(v.data, { code: 'VALIDATION_ERROR', fields: { full_name: 'required' } });
  assert.deepEqual(AppError.notFound().data, { code: 'NOT_FOUND' });
  const codes = [[AppError.unauthenticated(), 401, 'UNAUTHENTICATED'], [AppError.forbidden(), 403, 'FORBIDDEN'], [AppError.conflict(), 409, 'CONFLICT'],
    [AppError.payloadTooLarge(), 413, 'PAYLOAD_TOO_LARGE'], [AppError.serviceUnavailable(), 502, 'SERVICE_UNAVAILABLE'], [AppError.gatewayTimeout(), 504, 'GATEWAY_TIMEOUT']];
  for (const [err, status, code] of codes) assert.deepEqual([err.statusCode, err.code], [status, code]);
});

test('ApiResponse: đúng khuôn { success, status_code, message, data }', () => {
  assert.deepEqual(ApiResponse.build(200, 'OK', { a: 1 }), { success: true, status_code: 200, message: 'OK', data: { a: 1 } });
  assert.deepEqual(ApiResponse.build(200, 'Deleted'), { success: true, status_code: 200, message: 'Deleted', data: null });
  assert.equal(ApiResponse.build(202, 'Accepted').success, true);
  assert.equal(ApiResponse.build(404, 'x').success, false);
  const res = fakeRes();
  ApiResponse.created(res, { id: '1' });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.data, { id: '1' });
  const acc = fakeRes();
  ApiResponse.accepted(acc);
  assert.deepEqual([acc.statusCode, acc.body.data], [202, null]);
});

test('ApiResponse.list: data là mảng, tổng số ở header X-Total-Count', () => {
  const res = fakeRes();
  ApiResponse.list(res, [{ id: '1' }], 42);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['X-Total-Count'], '42');
  assert.deepEqual(res.body.data, [{ id: '1' }]);
});

test('ApiResponse.fromError: AppError giữ mã và code, lỗi lạ thành 500 không lộ chi tiết', () => {
  const r1 = fakeRes();
  ApiResponse.fromError(r1, AppError.validation({ title: 'must be at most 255 characters' }));
  assert.equal(r1.statusCode, 400);
  assert.equal(r1.body.success, false);
  assert.equal(r1.body.message, 'Validation failed');
  assert.deepEqual(r1.body.data, { code: 'VALIDATION_ERROR', fields: { title: 'must be at most 255 characters' } });
  const r2 = fakeRes();
  const orig = console.error; console.error = () => {};
  ApiResponse.fromError(r2, new Error('mật khẩu db = abc'));
  console.error = orig;
  assert.equal(r2.statusCode, 500);
  assert.deepEqual(r2.body.data, { code: 'INTERNAL_ERROR' });
  assert.equal(r2.body.message, 'Internal server error');
});

test('userContext: đọc header, thiếu hoặc sai thì GUEST', () => {
  assert.deepEqual(getUserContext(reqWith('12', 'FAMILY_ADMIN')), { userId: '12', role: 'FAMILY_ADMIN' });
  assert.deepEqual(getUserContext(reqWith(' 12 ', ' FAMILY_MEMBER ')), { userId: '12', role: 'FAMILY_MEMBER' });
  assert.deepEqual(getUserContext(reqWith(undefined, 'SYSTEM_ADMIN')), { userId: null, role: 'GUEST' });
  assert.deepEqual(getUserContext(reqWith('abc', 'SYSTEM_ADMIN')), { userId: null, role: 'GUEST' });
  assert.deepEqual(getUserContext(reqWith('5', 'HACKER')), { userId: '5', role: 'GUEST' });
  assert.deepEqual(getUserContext({}), { userId: null, role: 'GUEST' });
  const req = reqWith('7', 'FAMILY_MEMBER'); let called = false;
  userContext(req, fakeRes(), () => { called = true; });
  assert.equal(called, true);
  assert.deepEqual(req.user, { userId: '7', role: 'FAMILY_MEMBER' });
});

test('requireRole: 401 UNAUTHENTICATED, 403 FORBIDDEN, cho qua khi đủ quyền', () => {
  const mw = requireRole(Roles.FAMILY_ADMIN);
  let res = fakeRes(); let next = 0;
  mw(reqWith(undefined, undefined), res, () => next++);
  assert.equal(res.statusCode, 401); assert.equal(res.body.data.code, 'UNAUTHENTICATED'); assert.equal(next, 0);
  res = fakeRes();
  mw(reqWith('3', 'FAMILY_MEMBER'), res, () => next++);
  assert.equal(res.statusCode, 403); assert.equal(res.body.data.code, 'FORBIDDEN'); assert.equal(res.body.success, false); assert.equal(next, 0);
  mw(reqWith('3', 'FAMILY_ADMIN'), fakeRes(), () => next++);
  assert.equal(next, 1);
  mw(reqWith('1', 'SYSTEM_ADMIN'), fakeRes(), () => next++);
  assert.equal(next, 2);
  const guestOk = requireRole(Roles.GUEST); let n2 = 0;
  guestOk(reqWith(), fakeRes(), () => n2++);
  assert.equal(n2, 1);
  assert.throws(() => requireRole('ADMIN'), /không hợp lệ/);
});

test('healthRoute: { service, status: "UP" }', () => {
  const res = fakeRes();
  healthRoute('community-service')({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, { service: 'community-service', status: 'UP' });
  const routes = {};
  registerHealthRoute({ get: (p, h) => { routes[p] = h; } }, 'x');
  assert.equal(typeof routes['/health'], 'function');
});

/** Server giả để thử httpClient. */
function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(typeof obj === 'string' ? obj : JSON.stringify(obj)); };

test('httpClient: thành công trả data, chuyển tiếp danh tính và query', async () => {
  const { server, url } = await startServer((req, res) => {
    let raw = ''; req.on('data', (c) => { raw += c; });
    req.on('end', () => send(res, 200, ApiResponse.build(200, 'OK', { path: req.url, uid: req.headers['x-user-id'], role: req.headers['x-user-role'], body: raw })));
  });
  const data = await callService(url, '/internal/x', { method: 'POST', query: { a: 1, b: undefined }, body: { x: 1 }, user: { userId: '4', role: 'FAMILY_MEMBER' } });
  server.close();
  assert.equal(data.path, '/internal/x?a=1');
  assert.equal(data.uid, '4'); assert.equal(data.role, 'FAMILY_MEMBER');
  assert.equal(data.body, '{"x":1}');
});

test('httpClient: 202 với data null vẫn là thành công', async () => {
  const { server, url } = await startServer((req, res) => send(res, 202, ApiResponse.build(202, 'Accepted', null)));
  assert.equal(await callService(url, '/internal/audit', { method: 'POST', body: {} }), null);
  server.close();
});

test('httpClient: lỗi 4xx của downstream giữ nguyên mã và code, 5xx đổi thành 502', async () => {
  const { server, url } = await startServer((req, res) => {
    if (req.url === '/nf') send(res, 404, { success: false, status_code: 404, message: 'Not found', data: { code: 'NOT_FOUND' } });
    else if (req.url === '/bad') send(res, 400, { success: false, status_code: 400, message: 'Validation failed', data: { code: 'VALIDATION_ERROR', fields: { x: 'required' } } });
    else send(res, 500, { success: false, status_code: 500, message: 'DB down', data: { code: 'INTERNAL_ERROR' } });
  });
  await assert.rejects(callService(url, '/nf'), (e) => e instanceof AppError && e.statusCode === 404 && e.code === 'NOT_FOUND');
  await assert.rejects(callService(url, '/bad'), (e) => e.statusCode === 400 && e.fields?.x === 'required');
  await assert.rejects(callService(url, '/boom'), (e) => e.statusCode === 502 && e.code === 'SERVICE_UNAVAILABLE');
  server.close();
});

test('httpClient: sai định dạng hoặc không phải JSON thì 502', async () => {
  const { server, url } = await startServer((req, res) => {
    if (req.url === '/bad') send(res, 200, { hello: 'world' });
    else send(res, 200, '<html>không phải json</html>');
  });
  await assert.rejects(callService(url, '/bad'), (e) => e.statusCode === 502);
  await assert.rejects(callService(url, '/html'), (e) => e.statusCode === 502);
  server.close();
});

test('httpClient: quá thời gian thì 504 GATEWAY_TIMEOUT, không kết nối được thì 502', async () => {
  const { server, url } = await startServer((req, res) => { setTimeout(() => send(res, 200, ApiResponse.build(200, 'OK')), 300); });
  await assert.rejects(callService(url, '/slow', { timeoutMs: 50 }), (e) => e.statusCode === 504 && e.code === 'GATEWAY_TIMEOUT');
  server.closeAllConnections?.(); server.close();
  await assert.rejects(callService('http://127.0.0.1:1', '/x', { timeoutMs: 500 }), (e) => e.statusCode === 502 && e.code === 'SERVICE_UNAVAILABLE');
});