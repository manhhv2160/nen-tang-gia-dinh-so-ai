import { AppError } from '../../../../shared/src/AppError.js';

export const unauthorized = () => AppError.unauthenticated();
export const forbidden = (message = 'Forbidden') => AppError.forbidden(message);
export const notFound = (message = 'Resource not found') => AppError.notFound(message);
export const conflict = (message = 'Resource already exists') => AppError.conflict(message);
