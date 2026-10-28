# genealogy-service

Phụ trách: Người 2 · Cổng nội bộ: 3002 · Database: genealogy_db

## Dữ liệu sở hữu
- `family`
- `branch`
- `member`
- `parent_child_relationship`
- `marriage`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/families` | Dòng họ / gia đình |
| CRUD | `/branches` | Nhánh họ |
| CRUD | `/members` | Thành viên (lọc theo nghề nghiệp, nơi ở, thế hệ) |
| CRUD | `/relationships` | Quan hệ cha-con |
| CRUD | `/marriages` | Hôn nhân |
| GET | `/tree?family_id=` | Dữ liệu cây gia phả (nút + cạnh) |
| GET | `/relationships/query?from=&to=` | Truy vấn quan hệ giữa hai thành viên |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/members/:id` | Hồ sơ một thành viên |
| GET | `/internal/members/search?q=` | Tìm thành viên cho ai-service |
| GET | `/internal/memberships?user_id=` | Người dùng thuộc dòng họ nào |
| GET | `/internal/stats` | Số liệu cho dashboard |

## Gọi tới service khác
- auth (kiểm tra user_id khi liên kết tài khoản)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
