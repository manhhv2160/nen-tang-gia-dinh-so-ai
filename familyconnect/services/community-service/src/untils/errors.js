import { AppError } from '../../../../shared/src/AppError.js';

export const unauthorized = () => new AppError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });
export const forbidden = (message = 'Forbidden') => new AppError(403, message, { code: 'FORBIDDEN' });
export const notFound = (message = 'Resource not found') => new AppError(404, message, { code: 'NOT_FOUND' });
export const conflict = (message = 'Resource already exists') => new AppError(409, message, { code: 'CONFLICT' });
