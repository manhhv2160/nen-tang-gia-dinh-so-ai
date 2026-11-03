# community-service

Phụ trách: Người 3 · Cổng nội bộ: 3003 · Database: community_db

## Dữ liệu sở hữu
- `post`
- `comment`
- `reaction`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET, POST | `/posts?family_id=` | Liệt kê bài theo dòng họ hoặc tạo bài (NEWS, ANNOUNCEMENT, GENERAL) |
| GET, PATCH, DELETE | `/posts/:id` | Xem, sửa (tác giả) hoặc xóa bài (tác giả; xóa kèm bình luận và cảm xúc) |
| GET, POST | `/comments?post_id=` | Liệt kê bình luận theo bài hoặc tạo bình luận |
| PATCH, DELETE | `/comments/:id` | Sửa hoặc xóa bình luận (tác giả) |
| GET, POST | `/reactions?post_id=` | Liệt kê hoặc thả cảm xúc; mỗi người một cảm xúc cho mỗi bài, thả lại để đổi loại |
| DELETE | `/reactions/:id` | Xóa cảm xúc của chính người đã thả |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/stats?family_id=` | Số liệu cho dashboard (lọc dòng họ tùy chọn) |
| GET | `/internal/activity?family_id=&limit=` | Hoạt động cộng đồng gần đây của dòng họ |

## Gọi tới service khác
- genealogy (kiểm tra người dùng thuộc dòng họ qua memberships)
- report (ghi nhật ký các thao tác tạo, sửa, xóa)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
