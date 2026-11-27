// Lỗi nghiệp vụ dùng chung cho post/comment/reaction (shared/src/AppError.js, mục 2.2).
import { AppError } from '../../../../shared/src/AppError.js';

export const unauthorized = (message = 'Authentication required') => AppError.unauthenticated(message);
export const forbidden = (message = 'Forbidden') => AppError.forbidden(message);
export const notFound = (message = 'Resource not found') => AppError.notFound(message);
export const conflict = (message = 'Resource already exists') => AppError.conflict(message);
