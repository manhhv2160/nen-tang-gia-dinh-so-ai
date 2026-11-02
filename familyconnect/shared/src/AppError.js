// Lỗi nghiệp vụ có mã HTTP.
// Ném AppError ở service/controller, rồi trả về client bằng ApiResponse.fromError(res, err).

export class AppError extends Error {
  /**
   * @param {number} statusCode mã HTTP (400, 401, 403, 404, 500, 502, 504...)
   * @param {string} message nội dung thông báo cho người dùng
   * @param {object|Array} data dữ liệu kèm theo (mặc định {})
   */
  constructor(statusCode, message, data = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.data = data;
  }

  static badRequest(message = 'Dữ liệu không hợp lệ', data = {}) {
    return new AppError(400, message, data);
  }

  static unauthorized(message = 'Chưa đăng nhập') {
    return new AppError(401, message);
  }

  static forbidden(message = 'Không đủ quyền thực hiện') {
    return new AppError(403, message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new AppError(404, message);
  }

  /** Service được gọi trả lỗi hoặc trả sai định dạng. */
  static badGateway(message = 'Dịch vụ phía sau trả lỗi') {
    return new AppError(502, message);
  }

  /** Service được gọi không trả lời kịp. */
  static gatewayTimeout(message = 'Dịch vụ phía sau phản hồi quá chậm') {
    return new AppError(504, message);
  }
}
// Lỗi nghiệp vụ có mã HTTP
