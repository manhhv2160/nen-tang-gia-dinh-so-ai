// Kiểm tra dữ liệu đầu vào theo docs/api-contract.md mục 2.3 và 2.5.
// Gom mọi lỗi vào `fields` rồi ném AppError 400 VALIDATION_ERROR một lần (done()).
import { AppError, isValidEnum } from '../shared.js';

const MAX_BIGINT = 9223372036854775807n;

export class Validator {
  constructor() {
    this.fields = {};
  }

  fail(field, reason) {
    if (!(field in this.fields)) this.fields[field] = reason;
  }

  /** ID là chuỗi chữ số. Trả chuỗi đã chuẩn hóa ("007" thành "7") hoặc null nếu thiếu hoặc sai. */
  id(value, field, { required = true } = {}) {
    const text = value === undefined || value === null ? '' : String(value).trim();
    if (!text) {
      if (required) this.fail(field, 'required');
      return null;
    }
    if (!/^\d{1,19}$/.test(text) || BigInt(text) < 1n || BigInt(text) > MAX_BIGINT) {
      this.fail(field, 'must be a numeric id');
      return null;
    }
    return String(BigInt(text));
  }

  /** Chuỗi được cắt khoảng trắng hai đầu; chuỗi rỗng coi như thiếu (trả null). */
  text(value, field, { max, required = false } = {}) {
    if (value === undefined || value === null) {
      if (required) this.fail(field, 'required');
      return null;
    }
    if (typeof value !== 'string') {
      this.fail(field, 'must be a string');
      return null;
    }
    const text = value.trim();
    if (!text) {
      if (required) this.fail(field, 'required');
      return null;
    }
    if (text.length > max) {
      this.fail(field, `must be at most ${max} characters`);
      return null;
    }
    return text;
  }

  /** Giá trị phải thuộc enum. Thiếu thì trả fallback (hoặc lỗi nếu required). */
  enumValue(value, field, enumObj, { required = false, fallback = null } = {}) {
    if (value === undefined || value === null || value === '') {
      if (required) this.fail(field, 'required');
      return fallback;
    }
    if (!isValidEnum(enumObj, value)) {
      this.fail(field, `must be one of ${Object.values(enumObj).join(', ')}`);
      return fallback;
    }
    return value;
  }

  /** Ném AppError 400 nếu đã có lỗi. */
  done() {
    if (Object.keys(this.fields).length > 0) throw AppError.validation(this.fields);
  }
}

/** limit mặc định 50 và tối đa 100 (vượt thì cắt xuống 100), offset mặc định 0. */
export function parsePaging(query, v, { defaultLimit = 50, maxLimit = 100 } = {}) {
  const read = (raw, fallback, min, field) => {
    if (raw === undefined || raw === '') return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) {
      v.fail(field, `must be an integer >= ${min}`);
      return fallback;
    }
    return n;
  };
  return {
    limit: Math.min(read(query.limit, defaultLimit, 1, 'limit'), maxLimit),
    offset: Math.min(read(query.offset, 0, 0, 'offset'), 1_000_000),
  };
}

/** sort=<trường> tăng dần, sort=-<trường> giảm dần. Trả { field, direction: 'ASC' | 'DESC' }. */
export function parseSort(raw, allowed, fallback, v) {
  const value = raw === undefined || raw === '' ? fallback : String(raw);
  const field = value.startsWith('-') ? value.slice(1) : value;
  if (!allowed.includes(field)) {
    v.fail('sort', `must be one of ${allowed.flatMap((f) => [f, `-${f}`]).join(', ')}`);
    return { field: allowed[0], direction: 'DESC' };
  }
  return { field, direction: value.startsWith('-') ? 'DESC' : 'ASC' };
}

/** Body phải là một đối tượng JSON. */
export function requireBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.validation({ body: 'must be a JSON object' });
  }
  return body;
}