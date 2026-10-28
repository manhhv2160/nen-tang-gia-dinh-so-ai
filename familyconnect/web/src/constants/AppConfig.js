// Cấu hình chung của frontend. Sửa ở đây, không rải địa chỉ API trong code.
export const AppConfig = Object.freeze({
  // Địa chỉ gốc của API (gateway). Đường dẫn tương đối: cùng máy chủ với trang web.
  API_BASE_URL: '/api/v1',

  // Quá thời gian này (ms) thì hủy yêu cầu.
  REQUEST_TIMEOUT_MS: 15000,

  // true: không gọi API thật, đọc dữ liệu mẫu trong thư mục mocks/ (GET /members -> mocks/members.json; POST /auth/login -> mocks/auth/login.post.json).
  USE_MOCKS: false,
  MOCKS_BASE_URL: 'mocks',

  // Trang chuyển tới khi cần đăng nhập / sau khi đăng nhập xong.
  LOGIN_PAGE: 'index.html',
  HOME_PAGE: 'dashboard.html',

  // Khóa lưu trong trình duyệt.
  STORAGE_TOKEN_KEY: 'fc_token',
  STORAGE_USER_KEY: 'fc_user',
});
