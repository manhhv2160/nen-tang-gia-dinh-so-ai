 Điểm nhập duy nhất tới thư mục shared của repo đường dẫn tương đối chỉ viết ở đây,
 các tệp khác trong service import từ '.shared.js' (hoặc '..shared.js').
 Trong Docker, shared nằm cạnh services nên đường dẫn này vẫn đúng.
export { ApiResponse } from '......sharedsrcApiResponse.js';
export { AppError } from '......sharedsrcAppError.js';
export { Roles, PostTypes, ReactionTypes, isValidEnum, roleAtLeast } from '......sharedsrcenums.js';
export { requireRole } from '......sharedsrcrequireRole.js';
export { registerHealthRoute } from '......sharedsrchealthRoute.js';
export { callService } from '......sharedsrchttpClient.js';