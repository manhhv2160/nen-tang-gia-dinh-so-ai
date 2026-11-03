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
| GET, POST | `/families` | Liệt kê dòng họ (người thường chỉ thấy dòng họ mình thuộc) hoặc tạo dòng họ (SYSTEM_ADMIN) |
| GET, PATCH, DELETE | `/families/:id` | Xem, sửa (quản trị dòng họ) hoặc xóa (SYSTEM_ADMIN) dòng họ |
| GET, POST | `/branches?family_id=` | Liệt kê nhánh theo dòng họ hoặc tạo nhánh (quản trị dòng họ) |
| GET, PATCH, DELETE | `/branches/:id` | Xem, sửa hoặc xóa nhánh (quản trị dòng họ) |
| GET, POST | `/members?family_id=` | Liệt kê thành viên theo dòng họ (lọc theo nhánh, thế hệ, giới tính, xác minh, nghề nghiệp, địa chỉ, tên) hoặc tạo (quản trị dòng họ) |
| GET, PATCH, DELETE | `/members/:id` | Xem, sửa hoặc xóa thành viên (quản trị dòng họ) |
| POST | `/members/:id/link-user` | Liên kết thành viên với tài khoản |
| POST | `/members/:id/verify` | Xác minh thành viên; có thể nâng vai trò tài khoản đã liên kết |
| GET, POST | `/relationships` | Tra cứu theo `parent_member_id`, `child_member_id` hoặc `member_id`; tạo quan hệ cha-con |
| PATCH, DELETE | `/relationships/:id` | Sửa loại quan hệ hoặc xóa quan hệ |
| GET, POST | `/marriages` | Liệt kê hôn nhân theo `member_id` hoặc tạo hôn nhân |
| PATCH, DELETE | `/marriages/:id` | Sửa hoặc xóa hôn nhân |
| GET | `/tree?family_id=` | Dữ liệu cây gia phả; tùy chọn `branch_id`, hoặc `root_member_id` kèm `depth` |
| GET | `/relation-query?from_member_id=&to_member_id=` | Truy vấn quan hệ giữa hai thành viên |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/members/:id` | Hồ sơ một thành viên |
| GET | `/internal/members/search?q=&family_ids=` | Tìm thành viên theo từ khóa và các dòng họ được phép |
| GET | `/internal/memberships?user_id=` | Người dùng thuộc dòng họ nào |
| GET | `/internal/relation-query?from_member_id=&to_member_id=` | Truy vấn quan hệ cho ai-service |
| GET | `/internal/stats?family_id=` | Số liệu cho dashboard (lọc dòng họ tùy chọn) |

## Gọi tới service khác
- auth (tra cứu tài khoản, nâng GUEST thành FAMILY_MEMBER khi xác minh)
- report (ghi nhật ký các thao tác tạo, sửa, xóa)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
