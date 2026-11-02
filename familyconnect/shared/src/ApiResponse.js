// Khuôn response chung { success, status_code, message, data } (docs/conventions.md).
// success là boolean, status_code là số nguyên, data là đối tượng hoặc mảng (không bao giờ null).

import { AppError } from './AppError.js';

export class ApiResponse {
  /** Tạo đối tượng response. success = true khi mã HTTP thuộc 2xx. */
  static build(statusCode, message, data = {}) {
    return {
      success: statusCode >= 200 && statusCode < 300,
      status_code: statusCode,
      message,
      data: data ?? {},
    };
  }

  /** Gửi response (res kiểu Express: res.status().json()). */
  static send(res, statusCode, message, data = {}) {
    return res.status(statusCode).json(ApiResponse.build(statusCode, message, data));
  }

  static ok(res, data = {}, message = 'OK') {
    return ApiResponse.send(res, 200, message, data);
  }

  static created(res, data = {}, message = 'Created') {
    return ApiResponse.send(res, 201, message, data);
  }

  static error(res, statusCode, message, data = {}) {
    return ApiResponse.send(res, statusCode, message, data);
  }

  /**
   * Đổi một lỗi thành response.
   * AppError giữ nguyên mã và nội dung; lỗi lạ trả 500 với thông báo chung, không lộ chi tiết nội bộ.
   */
  static fromError(res, err) {
    if (err instanceof AppError) {
      return ApiResponse.error(res, err.statusCode, err.message, err.data);
    }
    console.error('[shared] Lỗi không lường trước:', err);
    return ApiResponse.error(res, 500, 'Lỗi hệ thống');
  }
}
// Khuôn response chung { success, status_code, message, data }
// Edit 
