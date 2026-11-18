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
| GET | `/relationships/query?from_member_id=&to_member_id=` | Truy vấn đường đi và loại quan hệ |
| PATCH, DELETE | `/relationships/:id` | Sửa loại quan hệ hoặc xóa quan hệ |
| GET, POST | `/marriages` | Liệt kê hôn nhân theo `member_id` hoặc tạo hôn nhân |
| PATCH, DELETE | `/marriages/:id` | Sửa hoặc xóa hôn nhân |
| GET | `/tree?family_id=` | Dữ liệu cây gia phả; tùy chọn `branch_id`, hoặc `root_member_id` kèm `depth` |
| GET | `/relation-query?from_member_id=&to_member_id=` | Alias tương thích cho truy vấn quan hệ |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/members/:id` | Hồ sơ một thành viên; 404 nếu không tồn tại |
| GET | `/internal/members/search?q=&family_ids=` | Tìm thành viên theo từ khóa và các dòng họ được phép |
| GET | `/internal/memberships?user_id=` | Liệt kê tất cả dòng họ liên kết với tài khoản qua các thành viên; mảng rỗng nếu chưa liên kết |
| GET | `/internal/relation-query?from_member_id=&to_member_id=` | Truy vấn quan hệ cho ai-service |
| GET | `/internal/stats?family_id=` | Số liệu gia phả cho report-service; lọc dòng họ tùy chọn |

## Gọi tới service khác
- auth (tra cứu tài khoản, nâng GUEST thành FAMILY_MEMBER khi xác minh)
- report (gửi `POST /internal/audit` không chờ phản hồi sau mỗi thao tác tạo, sửa, xóa)

## Đã triển khai
- Schema PostgreSQL cho `family`, `branch`, `member`, `parent_child_relationship`, `marriage`.
- CRUD dòng họ, nhánh và thành viên theo API ở trên; danh sách hỗ trợ phân trang, lọc và `X-Total-Count`.
- CRUD quan hệ cha-con, hôn nhân; truy vấn quan hệ và dựng cây gia phả.
- Phân quyền theo `X-User-Id`, `X-User-Role` và tư cách thành viên trong dòng họ.
- Nhật ký audit `CREATE`, `UPDATE`, `DELETE` cho dòng họ, nhánh, thành viên, quan hệ và hôn nhân.
- `GET /health`.

Liên kết/xác minh tài khoản và một số endpoint `/internal` vẫn cần được hoàn thiện riêng.

## Dữ liệu mẫu cho Docker

`db/seed/genealogy-sample.sql` tạo một dòng họ mẫu gồm 3 chi họ, 15 thành viên qua 3 thế hệ, quan hệ cha-con (có cả `ADOPTED`) và các trạng thái hôn nhân `MARRIED`, `DIVORCED`, `WIDOWED`. Script có thể chạy lại mà không thêm bản ghi trùng.

Nếu database `genealogy_db` chưa có bảng, áp dụng schema vào đúng database trước (dùng schema hiện tại trong `db/init/20-genealogy.sql`). File hiện tại không có lệnh `\connect`, nên bước này cần thiết khi khởi tạo database rỗng để bảo đảm schema được tạo trong `genealogy_db`, không phải database mặc định `postgres`. Chạy các lệnh từ thư mục `familyconnect`:

```powershell
$OutputEncoding = New-Object System.Text.UTF8Encoding
Get-Content -Raw .\db\init\20-genealogy.sql | docker compose exec -T db psql -1 -v ON_ERROR_STOP=1 -U genealogy_svc -d genealogy_db
```

Sau đó nạp dữ liệu mẫu. Tham số `sample_user_id` nên là ID của tài khoản SYSTEM_ADMIN trong `auth_db` (kiểm tra bằng `SELECT user_id, email FROM users;`):

```powershell
$OutputEncoding = New-Object System.Text.UTF8Encoding
Get-Content -Raw .\db\seed\genealogy-sample.sql | docker compose exec -T db psql -v ON_ERROR_STOP=1 -v sample_user_id=2 -U genealogy_svc -d genealogy_db
```

Các endpoint có thể thử qua gateway: `/api/v1/families`, `/api/v1/branches?family_id=<id>`, `/api/v1/members?family_id=<id>`, `/api/v1/relationships?member_id=<id>`, `/api/v1/marriages?member_id=<id>` và `/api/v1/tree?family_id=<id>`. Đăng nhập bằng tài khoản admin mặc định để lấy Bearer token. Dữ liệu seed không liên kết thành viên với tài khoản người dùng.
