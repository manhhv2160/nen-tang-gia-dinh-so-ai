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
| CRUD | `/posts` | Bài đăng (NEWS | ANNOUNCEMENT | GENERAL) |
| CRUD | `/comments` | Bình luận (lọc theo post_id) |
| CRUD | `/reactions` | Thả cảm xúc, mỗi người một cảm xúc cho mỗi bài |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/stats` | Số liệu cho dashboard |

## Gọi tới service khác
- genealogy (kiểm tra người dùng thuộc family_id)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
