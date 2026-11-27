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
| GET, PATCH, DELETE | `/posts/:id` | Xem, sửa hoặc xóa bài (chỉ tác giả hoặc `SYSTEM_ADMIN`; xóa kèm bình luận và cảm xúc) |
| GET, POST | `/comments?post_id=` | Liệt kê bình luận theo bài hoặc tạo bình luận |
| PATCH, DELETE | `/comments/:id` | Sửa hoặc xóa bình luận (chỉ tác giả hoặc `SYSTEM_ADMIN`) |
| GET, POST | `/reactions?post_id=` | Liệt kê hoặc thả cảm xúc; mỗi người một cảm xúc cho mỗi bài, thả lại để đổi loại |
| DELETE | `/reactions/:id` | Xóa cảm xúc của chính người đã thả (hoặc `SYSTEM_ADMIN`) |

Quy tắc chi tiết, trường dữ liệu và mã lỗi: xem mục 5.3 trong `docs/api-contract.md`.
Gateway đổi `/api/v1/posts` thành `/api/posts`, nên service mở route dưới `/api`. `GET /health` đặt ở gốc.

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả | Trạng thái |
|---|---|---|---|
| GET | `/internal/stats?family_id=` | Số liệu cho dashboard; bỏ trống `family_id` thì thống kê toàn hệ thống | Thẻ FMLCN-47 |
| GET | `/internal/activity?family_id=&limit=` | Hoạt động cộng đồng gần đây của dòng họ; `family_id` bắt buộc, `limit` 1–50 (mặc định 20) | Thẻ FMLCN-47 |

## Gọi tới service khác
- genealogy: `GET /internal/memberships?user_id=` để biết người dùng thuộc dòng họ nào. Kết quả lưu tạm 30 giây, timeout 5 giây.
- report: ghi nhật ký mỗi thao tác ghi qua `POST /internal/audit` (thẻ FMLCN-48), gửi không chờ phản hồi, timeout 3 giây.

## Cấu trúc
```
src/
  server.js            khởi động, đóng kết nối khi dừng
  app.js               middleware, mount route /api và /internal, xử lý lỗi
  config/              index.js (biến môi trường), database.js (pg Pool)
  clients/             GenealogyClient (membership), AuditClient (nhật ký)
  repositories/        truy vấn SQL (Post, Comment, Reaction, Stats)
  services/            luật nghiệp vụ, access.js (quyền theo dòng họ)
  controllers/         nhận request, trả ApiResponse
  routes/              route công khai và route nội bộ
  utils/               errors.js (AppError), validation.js (kiểm tra đầu vào)
test/                  api.test.js (FMLCN-46, 47), audit.test.js (FMLCN-48)
```

## Biến môi trường
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3003 | Cổng lắng nghe |
| `DATABASE_URL` | `postgres://community_svc:community_dev_pw@localhost:5432/community_db` | Kết nối community_db (docker-compose đã đặt sẵn) |
| `GENEALOGY_URL` | `http://localhost:3002` | Địa chỉ genealogy-service |
| `REPORT_URL` | `http://localhost:3007` | Địa chỉ report-service (nhận nhật ký) |

## Chạy và kiểm thử
```bash
npm install
npm start                       # hoặc: npm run dev
npm test                        # chỉ chạy 17 test khi có TEST_DATABASE_URL, không thì bỏ qua
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/community_test npm test
```
`test/api.test.js` và `test/audit.test.js` gọi API thật trên PostgreSQL; genealogy-service và report-service được thay bằng server giả trong cùng tiến trình nên không cần Docker. Database test sẽ bị xóa và tạo lại bảng `post/comment/reaction`.

## Danh sách việc
- [x] Model và bảng trong `db/init` (FMLCN-46)
- [x] Repository, Service, Controller, Route (FMLCN-46)
- [x] Endpoint `/internal` (`/internal/stats`, `/internal/activity`) - thẻ FMLCN-47; `GET /health` đã có
- [x] Phân quyền theo header `X-User-Role` + membership của dòng họ (FMLCN-46)
- [x] Gửi nhật ký sau mỗi thao tác ghi (FMLCN-48)
- [x] Cập nhật bảng endpoint trong README này và `docs/api-contract.md`

## Ghi chú phân quyền (FMLCN-46)
- Mỗi endpoint cần `FAMILY_MEMBER` trở lên (`shared/src/requireRole.js`).
- Người gọi phải có membership ở `genealogy-service` (`GET /internal/memberships?user_id=`); kết quả cache 30 giây.
- `SYSTEM_ADMIN` bỏ qua kiểm tra membership nhưng vẫn phải có `X-User-Id` hợp lệ.
- `PATCH`/`DELETE` bài và bình luận chỉ tác giả (hoặc `SYSTEM_ADMIN`); cảm xúc chỉ người đã thả được xóa.

## Nhật ký (FMLCN-48)
Sau mỗi thao tác ghi, service gửi `POST /internal/audit` sang report-service (`src/clients/AuditClient.js`) rồi trả response ngay, **không chờ** kết quả; report-service lỗi hoặc chậm không ảnh hưởng API.

| Thao tác | `action` | `entity_type` | `entity_id` | `family_id` |
|---|---|---|---|---|
| `POST /api/posts` | CREATE | POST | `post_id` | của bài |
| `PATCH /api/posts/:id` | UPDATE | POST | `post_id` | của bài |
| `DELETE /api/posts/:id` | DELETE | POST | `post_id` | của bài |
| `POST /api/comments` | CREATE | COMMENT | `comment_id` | của bài chứa bình luận |
| `PATCH /api/comments/:id` | UPDATE | COMMENT | `comment_id` | của bài chứa bình luận |
| `DELETE /api/comments/:id` | DELETE | COMMENT | `comment_id` | của bài chứa bình luận |
| `POST /api/reactions` (lần đầu) | CREATE | REACTION | `reaction_id` | của bài |
| `POST /api/reactions` (đổi loại) | UPDATE | REACTION | `reaction_id` | của bài |
| `DELETE /api/reactions/:id` | DELETE | REACTION | `reaction_id` | của bài |

`user_id` là người thao tác (kể cả `SYSTEM_ADMIN`). Thao tác bị từ chối (401/403/400/404) không ghi nhật ký. Xóa bài ghi một sự kiện `DELETE POST`; bình luận và cảm xúc bị xóa theo bài (`ON DELETE CASCADE`) không ghi thêm sự kiện. Không gửi nội dung bài viết/bình luận, mật khẩu hay token. ID gửi dạng chuỗi; sự kiện thiếu `action` hoặc `entity_type` bị bỏ qua và ghi log.
