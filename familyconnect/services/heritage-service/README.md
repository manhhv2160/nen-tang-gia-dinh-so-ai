# heritage-service

Phụ trách: Người 4 · Cổng nội bộ: 3005 · Database: heritage_db

## Dữ liệu sở hữu
- `heritage`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET, POST | `/heritages?family_id=` | Liệt kê di sản theo dòng họ (lọc theo loại, từ khóa) hoặc tạo di sản (HISTORICAL_DOC, STORY, OUTSTANDING_MEMBER, PHOTO) |
| GET, PATCH, DELETE | `/heritages/:id` | Xem di sản; người tải lên sửa, người tạo xóa (kèm tệp) |
| POST | `/heritages/upload` | Tải tệp JPG, PNG, WEBP hoặc PDF lên (tối đa 10 MB) |
| GET | `/files/:name` | Lấy tệp (cần đăng nhập; phản hồi là nội dung tệp) |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/heritages/search?q=&family_ids=` | Tìm di sản theo từ khóa và các dòng họ được phép cho ai-service |
| GET | `/internal/stats?family_id=` | Số liệu cho dashboard (lọc dòng họ tùy chọn) |
| GET | `/internal/activity?family_id=&limit=` | Hoạt động di sản gần đây của dòng họ |

## Gọi tới service khác
- genealogy (kiểm tra người dùng thuộc dòng họ qua memberships)
- report (ghi nhật ký các thao tác tạo, sửa, xóa)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
