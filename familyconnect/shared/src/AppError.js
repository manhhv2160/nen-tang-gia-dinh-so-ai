// Lỗi nghiệp vụ có mã HTTP và mã lỗi (docs/api-contract.md mục 2.2).
// Ném AppError ở service, rồi trả về client bằng ApiResponse.fromError(res, err).

/** Mã lỗi trong data.code của response lỗi. */
export const ErrorCodes = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
});

export class AppError extends Error {
  /**
   * @param {number} statusCode mã HTTP
   * @param {string} code một giá trị của ErrorCodes
   * @param {string} message thông báo tiếng Anh (frontend dịch dựa vào code)
   * @param {Object<string,string>} [fields] tên trường và lý do, chỉ dùng cho lỗi 400
   */
  constructor(statusCode, code, message, fields) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields ?? null;
  }

  /** Nội dung data của response lỗi: { code } hoặc { code, fields }. */
  get data() {
    return this.fields ? { code: this.code, fields: this.fields } : { code: this.code };
  }

  /** 400: fields = { tên_trường: 'lý do' }, ví dụ { full_name: 'required' }. */
  static validation(fields, message = 'Validation failed') {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, message, fields);
  }

  static unauthenticated(message = 'Authentication required') {
    return new AppError(401, ErrorCodes.UNAUTHENTICATED, message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(403, ErrorCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Not found') {
    return new AppError(404, ErrorCodes.NOT_FOUND, message);
  }

  static conflict(message = 'Conflict') {
    return new AppError(409, ErrorCodes.CONFLICT, message);
  }

  static payloadTooLarge(message = 'Payload too large') {
    return new AppError(413, ErrorCodes.PAYLOAD_TOO_LARGE, message);
  }

  /** Service được gọi sập, trả sai định dạng hoặc trả lỗi 5xx. */
  static serviceUnavailable(message = 'Service unavailable') {
    return new AppError(502, ErrorCodes.SERVICE_UNAVAILABLE, message);
  }

  /** Service được gọi không trả lời kịp. */
  static gatewayTimeout(message = 'Gateway timeout') {
    return new AppError(504, ErrorCodes.GATEWAY_TIMEOUT, message);
  }
}
