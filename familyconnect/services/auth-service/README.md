# auth-service

Phụ trách: Người 1 · Cổng nội bộ: 3001 · Database: auth_db

## Dữ liệu sở hữu
- `users`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký (vai trò mặc định GUEST) |
| POST | `/auth/login` | Đăng nhập, trả JWT |
| GET | `/auth/me` | Thông tin người dùng hiện tại |
| GET | `/users` | Danh sách người dùng (SYSTEM_ADMIN) |
| GET | `/users/:id` | Chi tiết người dùng (chính người đó hoặc SYSTEM_ADMIN) |
| PATCH | `/users/:id` | Sửa hồ sơ của chính mình; chỉ SYSTEM_ADMIN được đổi vai trò |
| DELETE | `/users/:id` | Xóa người dùng (SYSTEM_ADMIN) |
| GET | `/user-lookup?ids=` | Tra cứu họ tên theo danh sách ID (tối đa 50, cần đăng nhập) |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/users/:id` | Thông tin cơ bản của một người dùng |
| GET | `/internal/users?ids=` | Tra cứu thông tin cơ bản theo danh sách ID (tối đa 100) |
| PATCH | `/internal/users/:id/role` | Đổi vai trò; genealogy dùng để nâng GUEST thành FAMILY_MEMBER sau xác minh |
| GET | `/internal/stats` | Số liệu cho dashboard |

## Gọi tới service khác
- report (ghi nhật ký đăng ký, đăng nhập, đổi vai trò và xóa người dùng)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
