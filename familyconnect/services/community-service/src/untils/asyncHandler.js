// Bọc handler bất đồng bộ: lỗi (kể cả AppError) được chuyển vào bộ xử lý lỗi của App.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};