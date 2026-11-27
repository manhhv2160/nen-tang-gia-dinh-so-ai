// Trang quản trị: người dùng, xác minh thành viên, nhật ký hệ thống
import { AuthGuard } from '../components/AuthGuard.js';
import { EnumBinder } from '../components/EnumBinder.js';
import { AdminService } from '../services/AdminService.js';
import { ReportService } from '../services/ReportService.js';
import { Labels } from '../constants/Enums.js';
import { errorText } from '../utils/ErrorText.js';

const $ = (id) => document.getElementById(id);
const pad = (x) => String(x).padStart(2, '0');
const fmt = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso)
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const ACTION_TEXT = { CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xóa', LOGIN: 'Đăng nhập', LOGIN_FAILED: 'Đăng nhập sai', ROLE_CHANGE: 'Đổi vai trò', VERIFY: 'Xác minh' };
const ENTITY_TEXT = { USER: 'Tài khoản', FAMILY: 'Dòng họ', BRANCH: 'Nhánh', MEMBER: 'Thành viên', RELATIONSHIP: 'Quan hệ', MARRIAGE: 'Hôn nhân', POST: 'Bài đăng', COMMENT: 'Bình luận', REACTION: 'Cảm xúc', EVENT: 'Sự kiện', RSVP: 'Phản hồi', HERITAGE: 'Di sản' };
const PAGE = 50;

function el(tag, text, className) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}
function row(...cells) {
  const tr = document.createElement('tr');
  for (const c of cells) {
    const td = document.createElement('td');
    if (c instanceof Node) td.append(c); else td.textContent = c ?? '';
    tr.append(td);
  }
  return tr;
}

export class AdminController {
  constructor() {
    this.admin = new AdminService();
    this.report = new ReportService();
    this.offset = 0;
  }

  async init() {
    const user = AuthGuard.require('SYSTEM_ADMIN');
    if (!user) return;
    this.me = user;
    $('users-search').addEventListener('click', () => this.loadUsers());
    $('audit-search').addEventListener('click', () => { this.offset = 0; this.loadAudit(false); });
    $('audit-more').addEventListener('click', () => this.loadAudit(true));
    await Promise.allSettled([this.loadUsers(), this.loadAudit(false), this.loadPending()]);
  }

  #notice(id, message) {
    const box = $(id);
    box.textContent = message ?? '';
    box.hidden = !message;
  }

  // ---- Người dùng
  async loadUsers() {
    const body = $('users-body');
    this.#notice('users-notice', '');
    try {
      const users = await this.admin.listUsers({ q: $('users-q').value.trim(), role: $('users-role').value });
      body.replaceChildren();
      if (!users.length) return body.append(row('', 'Không có người dùng nào', '', '', ''));
      for (const u of users) body.append(this.#userRow(u));
      EnumBinder.bindAll(body);
    } catch (err) {
      body.replaceChildren(row('', 'Không tải được danh sách người dùng', '', '', ''));
      this.#notice('users-notice', errorText(err));
    }
  }

  #userRow(u) {
    const isSelf = String(u.user_id) === String(this.me.userId);
    let cellRole;
    let cellAction = '';
    if (u.role === 'SYSTEM_ADMIN' || isSelf) {
      cellRole = Labels.Roles[u.role] ?? u.role;
    } else {
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Vai trò');
      select.setAttribute('data-enum', 'Roles');
      select.setAttribute('data-enum-exclude', 'SYSTEM_ADMIN');
      select.setAttribute('data-enum-selected', u.role);
      const save = el('button', 'Lưu', 'btn small');
      save.type = 'button';
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await this.admin.changeRole(u.user_id, select.value);
          this.#notice('users-notice', `Đã đổi vai trò của ${u.full_name || u.email}.`);
        } catch (err) {
          this.#notice('users-notice', errorText(err));
        } finally {
          save.disabled = false;
        }
      });
      cellRole = select;
      cellAction = save;
    }
    return row(String(u.user_id), u.full_name || '', u.email, cellRole, cellAction);
  }

  // ---- Chờ xác minh
  async loadPending() {
    const list = $('pending-list');
    list.replaceChildren();
    try {
      const families = await this.admin.families();
      let count = 0;
      for (const f of families.slice(0, 10)) {
        const members = await this.admin.pendingMembers(f.family_id);
        for (const m of members) {
          count += 1;
          const li = el('li', `${m.full_name} `);
          li.append(el('span', `· ${f.family_name}`, 'muted'));
          const ok = el('button', 'Duyệt', 'btn small');
          ok.type = 'button';
          ok.addEventListener('click', async () => {
            ok.disabled = true;
            try {
              await this.admin.verifyMember(m.member_id);
              li.remove();
            } catch (err) {
              ok.disabled = false;
              this.#notice('pending-notice', errorText(err));
            }
          });
          const wrap = el('span', undefined, 'row');
          wrap.append(ok);
          li.append(wrap);
          list.append(li);
        }
      }
      if (!count) list.append(el('li', 'Không có thành viên nào chờ xác minh', 'muted'));
    } catch (err) {
      list.append(el('li', 'Không tải được danh sách', 'muted'));
      this.#notice('pending-notice', errorText(err));
    }
  }

  // ---- Nhật ký hệ thống
  #auditFilters() {
    const f = { sort: '-created_at' };
    for (const [key, id] of [['action', 'audit-action'], ['entity_type', 'audit-entity'], ['user_id', 'audit-user']]) {
      const v = $(id).value.trim();
      if (v) f[key] = v;
    }
    const from = $('audit-from').value;
    const to = $('audit-to').value;
    if (from) f.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) f.to = new Date(`${to}T23:59:59`).toISOString();
    return f;
  }

  async loadAudit(append) {
    const body = $('audit-body');
    this.#notice('audit-notice', '');
    try {
      const logs = await this.report.auditLogs({ ...this.#auditFilters(), limit: PAGE, offset: this.offset });
      if (!append) body.replaceChildren();
      let names = new Map();
      try { names = await this.admin.lookupNames(logs.map((l) => l.user_id)); } catch { /* chỉ mất tên hiển thị */ }
      for (const l of logs) {
        const who = l.user_id ? `#${l.user_id}${names.get(String(l.user_id)) ? ` · ${names.get(String(l.user_id))}` : ''}` : 'Hệ thống';
        const what = `${ENTITY_TEXT[l.entity_type] ?? l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ''}`;
        body.append(row(fmt(l.created_at), who, ACTION_TEXT[l.action] ?? l.action, what));
      }
      if (!body.children.length) body.append(row('', '', 'Chưa có nhật ký nào', ''));
      this.offset += logs.length;
      $('audit-more').hidden = logs.length < PAGE;
    } catch (err) {
      if (!append) body.replaceChildren(row('', '', 'Không tải được nhật ký', ''));
      this.#notice('audit-notice', errorText(err));
    }
  }
}
