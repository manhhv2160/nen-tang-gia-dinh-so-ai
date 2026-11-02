// Kiểm tra đăng nhập, chuyển về trang đăng nhập (bổ sung)
import { AppConfig } from '../constants/AppConfig.js';
import { StorageHelper } from '../utils/StorageHelper.js';
import { User } from '../models/User.js';

/**
 * Đặt ở đầu mỗi trang cần đăng nhập:
 *   import { AuthGuard } from './src/components/AuthGuard.js';
 *   const user = AuthGuard.require();                 // chỉ cần đăng nhập
 *   const user = AuthGuard.require('FAMILY_ADMIN');   // cần vai trò từ FAMILY_ADMIN trở lên
 */
export class AuthGuard {
  /** Trả về User nếu hợp lệ, ngược lại chuyển trang và trả về null. */
  static require(minRole = null) {
    if (!StorageHelper.isLoggedIn()) {
      StorageHelper.clear();
      globalThis.location.replace(AppConfig.LOGIN_PAGE);
      return null;
    }

    const data = StorageHelper.getUser() ?? {};
    if (!data.role) data.role = StorageHelper.getRole();
    const user = User.from(data);

    if (minRole && !user.hasRole(minRole)) {
      globalThis.location.replace(AppConfig.HOME_PAGE);
      return null;
    }
    return user;
  }

  /** Dùng ở trang đăng nhập: đã đăng nhập rồi thì vào thẳng trang chủ. */
  static redirectIfLoggedIn() {
    if (StorageHelper.isLoggedIn()) {
      globalThis.location.replace(AppConfig.HOME_PAGE);
      return true;
    }
    return false;
  }
}