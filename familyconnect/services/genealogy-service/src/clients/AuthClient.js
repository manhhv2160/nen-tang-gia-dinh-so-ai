import { AppError, ErrorCodes } from '../../../../shared/src/AppError.js';
import config from '../config/index.js';

async function requestAuth(path, options = {}) {
    let response;
    try {
        response = await fetch(`${config.authUrl}${path}`, {
            ...options,
            headers: {
                ...(options.body ? { 'content-type': 'application/json' } : {}),
                ...options.headers,
            },
            signal: AbortSignal.timeout(3000),
        });
    } catch (error) {
        const timedOut = error?.name === 'TimeoutError';
        throw timedOut
            ? AppError.gatewayTimeout('Auth service timed out')
            : AppError.serviceUnavailable('Auth service is unavailable');
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new AppError(502, ErrorCodes.SERVICE_UNAVAILABLE, 'Auth service returned an invalid response');
    }

    if (response.status === 404) return null;
    if (!response.ok || payload.success !== true || !payload.data) {
        throw new AppError(502, ErrorCodes.SERVICE_UNAVAILABLE, 'Auth service rejected the internal request');
    }

    return payload.data;
}

export async function getUserById(userId) {
    return requestAuth(`/internal/users/${encodeURIComponent(userId)}`);
}

export async function promoteUserToFamilyMember(userId) {
    return requestAuth(`/internal/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'FAMILY_MEMBER' }),
    });
}
