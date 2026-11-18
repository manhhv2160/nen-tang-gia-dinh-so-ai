import { AppError } from '../../../../shared/src/AppError.js';
import { isValidEnum } from '../../../../shared/src/enums.js';

const MAX_BIGINT = 9223372036854775807n;

export const failValidation = (fields) => {
    throw new AppError(400, 'Validation failed', {
        code: 'VALIDATION_ERROR',
        fields,
    });
};

export function parseId(value, field = 'id') {
    const id = String(value ?? '').trim();
    if (!/^[1-9]\d*$/.test(id)) failValidation({ [field]: 'must be a positive integer' });
    if (BigInt(id) > MAX_BIGINT) failValidation({ [field]: 'exceeds the BIGINT range' });
    return id;
}

export function parseRequiredText(value, field, maxLength = 255) {
    if (typeof value !== 'string' || !value.trim()) {
        failValidation({ [field]: 'required' });
    }
    const text = value.trim();
    if (text.length > maxLength) failValidation({ [field]: `must be at most ${maxLength} characters` });
    return text;
}

export function parseOptionalText(value, field, maxLength = 255) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') failValidation({ [field]: 'must be a string or null' });
    const text = value.trim();
    if (text.length > maxLength) failValidation({ [field]: `must be at most ${maxLength} characters` });
    return text || null;
}

/** Giá trị phải nằm trong enum; `fallback` dùng khi client không gửi trường này. */
export function parseEnum(enumObj, value, field, fallback) {
    if (value === undefined) return fallback;
    if (!isValidEnum(enumObj, value)) {
        failValidation({ [field]: `must be one of ${Object.values(enumObj).join(', ')}` });
    }
    return value;
}

/** Lọc theo danh sách cố định, giá trị ngoài danh sách là lỗi 400. */
export function parseChoice(value, field, allowed, fallback) {
    if (value === undefined) return fallback;
    if (!allowed.includes(value)) {
        failValidation({ [field]: `must be one of ${allowed.join(', ')}` });
    }
    return value;
}

export function parsePagination(query, defaultLimit = 20) {
    const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
    const offset = query.offset === undefined ? 0 : Number(query.offset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        failValidation({ limit: 'must be an integer between 1 and 100' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
        failValidation({ offset: 'must be a non-negative integer' });
    }
    return { limit, offset };
}