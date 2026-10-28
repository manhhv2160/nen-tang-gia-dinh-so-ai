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
| GET | `/users` | Danh sách người dùng (FAMILY_ADMIN trở lên) |
| GET | `/users/:id` | Chi tiết người dùng |
| PATCH | `/users/:id` | Đổi vai trò/hồ sơ (SYSTEM_ADMIN) |
| DELETE | `/users/:id` | Xóa người dùng (SYSTEM_ADMIN) |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/users/:id` | Thông tin cơ bản của một người dùng |
| GET | `/internal/stats` | Số liệu cho dashboard |

## Gọi tới service khác
- Không gọi service nào

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
