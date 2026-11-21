# community-service

Phụ trách: Người 3 · Cổng nội bộ: 3003 · Database: community_db

## Dữ liệu sở hữu
- `post`
- `comment`
- `reaction`

Không đọc bảng của service khác và không có khóa ngoại sang service khác. Schema nằm ở `db/init/30-community.sql`.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET, POST | `/posts?family_id=` | Liệt kê bài theo dòng họ hoặc tạo bài (NEWS, ANNOUNCEMENT, GENERAL) |
| GET, PATCH, DELETE | `/posts/:id` | Xem, sửa (chính tác giả) hoặc xóa bài (tác giả hoặc quản trị dòng họ; xóa kèm bình luận và cảm xúc) |
| GET, POST | `/comments?post_id=` | Liệt kê bình luận theo bài hoặc tạo bình luận |
| PATCH, DELETE | `/comments/:id` | Sửa (chính tác giả) hoặc xóa (tác giả hoặc quản trị dòng họ) bình luận |
| GET, POST | `/reactions?post_id=` | Liệt kê hoặc thả cảm xúc; mỗi người một cảm xúc cho mỗi bài, thả lại để đổi loại |
| DELETE | `/reactions/:id` | Xóa cảm xúc của chính người đã thả |

Quy tắc chi tiết, trường dữ liệu và mã lỗi: xem mục 5.3 trong `docs/api-contract.md`.
Gateway đổi `/api/v1/posts` thành `/api/posts`, nên service mở route dưới `/api`. `GET /health` đặt ở gốc.

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/internal/stats?family_id=` | Số liệu cho dashboard (lọc dòng họ tùy chọn) | Thẻ FMLCN-47 |
| GET | `/internal/activity?family_id=&limit=` | Hoạt động cộng đồng gần đây của dòng họ | Thẻ FMLCN-47 |

## Gọi tới service khác
- genealogy: `GET /internal/memberships?user_id=` để biết người dùng thuộc dòng họ nào. Kết quả lưu tạm 30 giây, timeout 5 giây.
- report: ghi nhật ký mỗi thao tác ghi qua `POST /internal/audit` (thẻ FMLCN-48), gửi không chờ phản hồi, timeout 3 giây.

## Cấu trúc
