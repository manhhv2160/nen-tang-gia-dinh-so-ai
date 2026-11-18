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
- genealogy: `GET /internal/memberships?user_id=` để biết người dùng thuộc dòng họ nào. Kết quả được lưu tạm tối đa 60 giây, timeout 3 giây.
- report: ghi nhật ký các thao tác tạo, sửa, xóa qua `POST /internal/audit` (thẻ FMLCN-48). Các service trong repo đã có sẵn chỗ nhận `audit`, chỉ cần truyền vào `compose()`.

## Cấu trúc
```
src/
  server.js            khởi động, đóng kết nối khi dừng
  compose.js           ghép repository -> service -> controller -> App
  app.js               class App: middleware, route, xử lý lỗi
  shared.js            điểm nhập duy nhất tới shared/
  config/              index.js (biến môi trường), database.js (pg Pool)
  models/              Post, Comment, Reaction
  repositories/        truy vấn SQL
  services/            luật nghiệp vụ, FamilyAccess (quyền theo dòng họ)
  controllers/         nhận request, trả ApiResponse
  routes/              route và phân quyền (requireRole)
  clients/             GenealogyClient
  utils/               validators, asyncHandler
test/                  unit.test.js, api.integration.test.js
```

## Biến môi trường
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3003 | Cổng lắng nghe |
| `DATABASE_URL` | `postgres://community_svc:community_dev_pw@localhost:5432/community_db` | Kết nối community_db (docker-compose đã đặt sẵn) |
| `GENEALOGY_URL` | `http://localhost:3002` | Địa chỉ genealogy-service |
| `SERVICE_TIMEOUT_MS` | 3000 | Thời gian chờ khi gọi service khác |
| `MEMBERSHIP_CACHE_MS` | 60000 | Thời gian lưu tạm kết quả memberships |
| `DEV_FAMILY_IDS` | (trống) | Ví dụ `1,2`: bỏ qua genealogy-service, chỉ dùng khi phát triển, bị bỏ qua nếu `NODE_ENV=production` |

## Chạy và kiểm thử
```bash
npm install
npm start                       # hoặc: npm run dev
DEV_FAMILY_IDS=1 npm start      # chạy khi genealogy-service chưa xong
npm test                        # kiểm thử đơn vị; kiểm thử API tự bỏ qua nếu chưa có database thử
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/community_test npm test   # chạy cả kiểm thử API (xóa và tạo lại bảng trong database thử)
```

## Danh sách việc
- [x] Model và bảng trong `db/init`
- [x] Repository, Service, Controller, Route (CRUD bài đăng, bình luận, cảm xúc)
- [x] `GET /health`
- [ ] Endpoint `/internal/stats` và `/internal/activity` (thẻ FMLCN-47)
- [x] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [x] Cập nhật bảng endpoint trong README này (docs/api-contract.md đã có sẵn mục community)
- [ ] Gửi nhật ký thao tác cho report-service (thẻ FMLCN-48)
- [ ] Trang `feed.html` và các lớp frontend (thẻ FMLCN-46)
