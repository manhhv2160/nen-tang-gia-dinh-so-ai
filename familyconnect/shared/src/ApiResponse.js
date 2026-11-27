// Khuôn response chung { success, status_code, message, data } (docs/api-contract.md mục 2.1).
// success là boolean, status_code là số nguyên, message là chuỗi tiếng Anh, data là đối tượng, mảng hoặc null.
// Khi lỗi, data là { code, fields? }.

import { AppError, ErrorCodes } from './AppError.js';

export class ApiResponse {
  /** Tạo đối tượng response. success = true khi mã HTTP thuộc 2xx. */
  static build(statusCode, message, data = null) {
    return {
      success: statusCode >= 200 && statusCode < 300,
      status_code: statusCode,
      message,
      data: data === undefined ? null : data,
    };
  }

  /** Gửi response (res kiểu Express: res.status().json()). headers: { Tên: giá trị } gửi kèm. */
  static send(res, statusCode, message, data = null, headers = {}) {
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    return res.status(statusCode).json(ApiResponse.build(statusCode, message, data));
  }

  static ok(res, data = null, message = 'OK') {
    return ApiResponse.send(res, 200, message, data);
  }

  static created(res, data = null, message = 'Created') {
    return ApiResponse.send(res, 201, message, data);
  }

  /** 202: đã nhận, xử lý sau (chỉ dùng cho POST /internal/audit). */
  static accepted(res, message = 'Accepted') {
    return ApiResponse.send(res, 202, message, null);
  }

  /** Danh sách: data luôn là mảng, tổng số bản ghi khớp bộ lọc nằm ở header X-Total-Count (mục 2.5). */
  static list(res, rows, total, message = 'OK') {
    return ApiResponse.send(res, 200, message, rows, { 'X-Total-Count': String(total) });
  }

  /** Lỗi: data là { code, fields? }. */
  static error(res, statusCode, code, message, fields) {
    const data = fields ? { code, fields } : { code };
    return ApiResponse.send(res, statusCode, message, data);
  }

  /**
   * Đổi một lỗi thành response.
   * AppError giữ nguyên mã, code và fields; lỗi lạ trả 500 INTERNAL_ERROR, không lộ chi tiết nội bộ.
   */
  static fromError(res, err) {
    if (err instanceof AppError) {
      return ApiResponse.send(res, err.statusCode, err.message, err.data);
    }
    console.error('[shared] Lỗi không lường trước:', err);
    return ApiResponse.error(res, 500, ErrorCodes.INTERNAL_ERROR, 'Internal server error');
  }
}
