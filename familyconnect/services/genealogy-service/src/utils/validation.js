import { AppError } from '../../../../shared/src/AppError.js';

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

export function parseDate(value, field) {
    if (value === undefined || value === null || value === '') return value === undefined ? undefined : null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        failValidation({ [field]: 'must be a valid date in YYYY-MM-DD format' });
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        failValidation({ [field]: 'must be a valid date in YYYY-MM-DD format' });
    }
    return value;
}

export function parsePositiveInteger(value, field) {
    if (value === undefined || value === null || value === '') return value === undefined ? undefined : null;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) {
        failValidation({ [field]: 'must be a positive integer' });
    }
    return number;
}

export function parseBoolean(value, field) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    failValidation({ [field]: 'must be true or false' });
}

export function parsePagination(query) {
    const limit = query.limit === undefined ? 50 : Number(query.limit);
    const offset = query.offset === undefined ? 0 : Number(query.offset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        failValidation({ limit: 'must be an integer between 1 and 100' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
        failValidation({ offset: 'must be a non-negative integer' });
    }
    return { limit, offset };
}

export function assertDateOrder(dateOfBirth, dateOfDeath) {
    if (dateOfBirth && dateOfDeath && dateOfDeath < dateOfBirth) {
        failValidation({ date_of_death: 'must not be before date_of_birth' });
    }
}
