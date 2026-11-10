# FamilyConnect – Hợp đồng API v1

Sau khi duyệt, muốn đổi endpoint phải báo người đang dùng và ghi vào mục "Lịch sử thay đổi" ở cuối.

Ký hiệu: dấu `*` sau tên trường nghĩa là bắt buộc. `id` là chuỗi số (BIGINT), `ts` là timestamp, `date` là ngày, dấu `?` nghĩa là có thể null.

## 1. Phạm vi và địa chỉ

- API công khai: `/api/v1/...`, đi qua gateway (cổng 8080; trang web truy cập qua nginx, nginx chuyển `/api/` sang gateway).
- API nội bộ: `/internal/...`, chỉ các service gọi nhau trong mạng Docker. Gateway không công khai và trả 404 cho đường dẫn này.
- Mọi service có `GET /health` trả `{ service, status: "UP" }` trong khuôn response chung. Gateway có `GET /health` công khai.

## 2. Quy ước chung

### 2.1 Khuôn response

Mọi phản hồi JSON có đủ bốn trường:

```json
{ "success": true, "status_code": 200, "message": "OK", "data": {} }
```

- `success`: boolean. `status_code`: số nguyên. `message`: chuỗi tiếng Anh. `data`: đối tượng, mảng hoặc null.
- Khi lỗi, `success` là false và `data` là `{ code, fields }`. `code` là mã lỗi ở mục 2.2; `fields` (tên trường và lý do) chỉ có khi lỗi 400. Frontend dịch sang tiếng Việt dựa vào `code`, không dựa vào `message`.
- Hai ngoại lệ không theo khuôn JSON: `GET /files/:name` (trả về tệp) và request tải tệp lên (`multipart/form-data`). Phản hồi của request tải lên vẫn theo khuôn.

### 2.2 Mã trạng thái và mã lỗi

| Mã | Dùng khi | `data.code` |
|---|---|---|
| 200 | Đọc, sửa, xóa, và thao tác upsert cập nhật bản ghi cũ | |
| 201 | Tạo mới | |
| 202 | Đã nhận, xử lý sau (chỉ `POST /internal/audit`) | |
| 400 | Thiếu trường, sai kiểu, sai enum, vi phạm ràng buộc nghiệp vụ | `VALIDATION_ERROR` |
| 401 | Thiếu hoặc sai token; sai email hoặc mật khẩu | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | Không đủ vai trò, hoặc không thuộc dòng họ | `FORBIDDEN` |
| 404 | Không có bản ghi, hoặc đường dẫn không tồn tại | `NOT_FOUND` |
| 409 | Trùng dữ liệu hoặc xung đột trạng thái | `CONFLICT` |
| 413 | Body hoặc tệp quá lớn | `PAYLOAD_TOO_LARGE` |
| 429 | Vượt giới hạn tốc độ | `RATE_LIMITED` |
| 500 | Lỗi không lường trước (không lộ chi tiết) | `INTERNAL_ERROR` |
| 502, 503, 504 | Gateway không tới được service, service sập, hoặc quá thời gian | `SERVICE_UNAVAILABLE`, `GATEWAY_TIMEOUT` |

Khi nhà cung cấp AI lỗi, `ai-service` trả 503 với `code` là `AI_UNAVAILABLE`.

### 2.3 Kiểu dữ liệu

- Tên trường dùng `snake_case`; tên và giá trị enum theo `docs/conventions.md`.
- ID: chuỗi chứa chữ số, ví dụ `"12"`. Không bao giờ là số JSON.
- `date`: `YYYY-MM-DD`. `ts`: ISO 8601 theo UTC, ví dụ `2026-10-18T09:12:00.000Z`. Frontend đổi sang giờ địa phương khi hiển thị.
- Trường không có giá trị trả về `null`, không bỏ khỏi JSON.
- Enum: đúng chữ hoa như mục 3. Giá trị lạ trả 400.
- Chuỗi được cắt khoảng trắng hai đầu; chuỗi rỗng coi như thiếu. Tên và tiêu đề tối đa 255 ký tự; `content`, `bio`, `description` tối đa 10.000 ký tự.

### 2.4 Xác thực và phân quyền

- Client gửi `Authorization: Bearer <access_token>`. Token là JWT, hết hạn sau 8 giờ (`expires_in` tính bằng giây), payload gồm `user_id`, `role`, `iat`, `exp`.
- Gateway kiểm tra token, xóa mọi header `X-User-*` do client gửi, rồi gắn `X-User-Id` và `X-User-Role` khi chuyển cho service. Service chỉ tin hai header này.
- Chỉ ba route công khai: `POST /auth/register`, `POST /auth/login`, `GET /health`.
- Thứ bậc vai trò: `GUEST` < `FAMILY_MEMBER` < `FAMILY_ADMIN` < `SYSTEM_ADMIN`. SYSTEM_ADMIN được phép mọi thao tác.
- Ký hiệu ở cột "Quyền":

| Ký hiệu | Nghĩa |
|---|---|
| Công khai | Không cần token |
| Đăng nhập | Mọi vai trò, kể cả GUEST |
| Thành viên | Vai trò từ FAMILY_MEMBER trở lên và thuộc dòng họ liên quan |
| Quản trị dòng họ | FAMILY_ADMIN của dòng họ liên quan |
| Tác giả | Người tạo bản ghi (`user_id` khớp), hoặc Quản trị dòng họ |
| Quản trị hệ thống | SYSTEM_ADMIN |

- "Thuộc dòng họ" nghĩa là tài khoản có một thành viên liên kết (`member.user_id`) trong dòng họ đó. Service kiểm tra qua `GET /internal/memberships` của `genealogy` và được lưu tạm tối đa 60 giây. FAMILY_ADMIN chỉ quản trị các dòng họ mà mình thuộc về.
- Danh sách và truy vấn theo dòng họ bắt buộc có `family_id`; người không thuộc dòng họ đó nhận 403 (SYSTEM_ADMIN không bị yêu cầu).

### 2.5 Danh sách: phân trang, lọc, sắp xếp

- `limit` (mặc định 50, tối đa 100) và `offset` (mặc định 0). Tổng số bản ghi khớp bộ lọc nằm ở header phản hồi `X-Total-Count`; `data` luôn là mảng.
- Lọc: tham số trùng tên trường thì so sánh bằng. Các tham số lọc đặc biệt (`q`, `from`, `to`...) được ghi riêng ở từng endpoint. Tham số lạ bị bỏ qua.
- Sắp xếp: `sort=<trường>` tăng dần, `sort=-<trường>` giảm dần. Mỗi endpoint ghi các trường được phép và mặc định.

### 2.6 Ghi dữ liệu

- Khi tạo, server cấp `*_id`, `created_at`, `updated_at` và lấy `user_id` từ `X-User-Id`. Client có gửi các trường này cũng bị bỏ qua.
- `PATCH` sửa một phần: chỉ các trường nêu ở endpoint, trường khác bị bỏ qua; gửi `null` để xóa trường không bắt buộc. Không dùng `PATCH` để đổi khóa ngoại, trừ khi endpoint nói rõ.
- `DELETE` trả 200 với `data` là null. Xóa bản ghi cha thì xóa luôn bản ghi con trong cùng service.
- Giữa các service không có khóa ngoại: xóa một người dùng không tự xóa bài đăng của họ ở service khác (nội dung giữ lại; cách xử lý nhóm sẽ quyết định sau).

### 2.7 Giới hạn tốc độ

- Đăng nhập sai: tối đa 10 lần trong 15 phút theo IP, vượt thì 429.
- `/ai/*`: tối đa 20 request mỗi phút cho mỗi người dùng.
- Các route còn lại: 300 request mỗi phút cho mỗi IP.

### 2.8 Phiên bản

Tiền tố `/api/v1`. Thêm trường mới vào response hoặc thêm endpoint không cần đổi phiên bản, nên client phải bỏ qua trường lạ. Đổi tên, xóa trường hoặc đổi nghĩa thì phải lên `/api/v2`.

## 3. Enum

| Tên | Giá trị |
|---|---|
| `role` | GUEST, FAMILY_MEMBER, FAMILY_ADMIN, SYSTEM_ADMIN |
| `gender` | MALE, FEMALE, OTHER |
| `relationship_type` | BIOLOGICAL, ADOPTED |
| `status` của hôn nhân | MARRIED, DIVORCED, WIDOWED |
| `post_type` | NEWS, ANNOUNCEMENT, GENERAL |
| `reaction_type` | LIKE, LOVE, HAHA, WOW, SAD, ANGRY |
| `status` của RSVP | ATTENDING, DECLINED, MAYBE |
| `heritage_type` | HISTORICAL_DOC, STORY, OUTSTANDING_MEMBER, PHOTO |
| `action` của nhật ký (thêm mới) | CREATE, UPDATE, DELETE, LOGIN, LOGIN_FAILED, ROLE_CHANGE, VERIFY |
| `entity_type` của nhật ký (thêm mới) | USER, FAMILY, BRANCH, MEMBER, RELATIONSHIP, MARRIAGE, POST, COMMENT, REACTION, EVENT, RSVP, HERITAGE |
| `relation` của truy vấn quan hệ (thêm mới) | SELF, SPOUSE, PARENT, CHILD, SIBLING, GRANDPARENT, GRANDCHILD, UNCLE_AUNT, NIECE_NEPHEW, COUSIN, OTHER, NONE |

## 4. Đối tượng dữ liệu

| Đối tượng | Trường |
|---|---|
| `User` | `user_id` id, `email`, `full_name`, `phone`?, `role`, `created_at` ts, `updated_at` ts. Không bao giờ có mật khẩu |
| `Family` | `family_id` id, `user_id` id (người tạo), `family_name`, `description`?, `origin_place`?, `created_at`, `updated_at` |
| `Branch` | `branch_id` id, `family_id` id, `branch_name`, `description`?, `created_at`, `updated_at` |
| `Member` | `member_id` id, `family_id` id, `branch_id`? id, `user_id`? id, `full_name`, `gender`, `date_of_birth`? date, `date_of_death`? date, `generation`? số nguyên, `occupation`?, `education`?, `address`?, `bio`?, `is_verified` boolean, `created_at`, `updated_at` |
| `Relationship` | `relationship_id` id, `parent_member_id` id, `child_member_id` id, `relationship_type`, `created_at`, `updated_at` |
| `Marriage` | `marriage_id` id, `spouse_1_member_id` id, `spouse_2_member_id` id, `marriage_date`? date, `status`, `created_at`, `updated_at` |
| `Post` | `post_id` id, `family_id` id, `user_id` id, `post_type`, `title`?, `content`, `comment_count` số nguyên, `reaction_counts` đối tượng (khóa là các `reaction_type`, giá trị là số nguyên), `my_reaction`? (phản ứng của người đang gọi), `created_at`, `updated_at` |
| `Comment` | `comment_id` id, `post_id` id, `user_id` id, `content`, `created_at`, `updated_at` |
| `Reaction` | `reaction_id` id, `post_id` id, `user_id` id, `reaction_type`, `created_at`, `updated_at` |
| `Event` | `event_id` id, `family_id` id, `user_id` id (người tổ chức), `title`, `description`?, `location`?, `start_time` ts, `end_time`? ts, `rsvp_counts` đối tượng (khóa là các `status` RSVP), `my_rsvp`? (phản hồi của người đang gọi), `created_at`, `updated_at` |
| `Rsvp` | `rsvp_id` id, `event_id` id, `user_id` id, `status`, `created_at`, `updated_at` |
| `Heritage` | `heritage_id` id, `family_id` id, `user_id` id (người tải lên), `heritage_type`, `title`, `content`?, `file_url`?, `created_at`, `updated_at` |
| `AuditLog` | `audit_id` id, `user_id`? id, `action`, `entity_type`, `entity_id`? id, `family_id`? id, `created_at` |

Tên người dùng không nằm trong các đối tượng trên. Frontend gom các `user_id` rồi gọi `GET /user-lookup` một lần để lấy họ tên.

## 5. Endpoint công khai

### 5.1 auth-service (Người 1)

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `POST /auth/register` | Công khai | Body: `email`*, `password`* (từ 8 ký tự), `full_name`*, `phone`. Vai trò mặc định là GUEST | 201 `{ user, access_token, token_type, expires_in }` | 400, 409 (email đã tồn tại) |
| `POST /auth/login` | Công khai | Body: `email`*, `password`* | 200, cùng dạng như trên | 400, 401 `INVALID_CREDENTIALS`, 429 |
| `GET /auth/me` | Đăng nhập | Không | 200 `User` | 401 |
| `GET /users` | Quản trị hệ thống | Lọc `role`, `q` (email hoặc họ tên chứa). Sort `created_at`, `full_name` | 200 `User[]` | 401, 403 |
| `GET /users/:id` | Chính người đó hoặc quản trị hệ thống | Không | 200 `User` | 403, 404 |
| `PATCH /users/:id` | Chính người đó (`full_name`, `phone`); `role` chỉ quản trị hệ thống | Body: `full_name`, `phone`, `role` | 200 `User` | 400, 403, 404 |
| `DELETE /users/:id` | Quản trị hệ thống | Không | 200 null | 403, 404, 409 (không tự xóa chính mình) |
| `GET /user-lookup` | Đăng nhập | `ids`* (các id cách nhau bằng dấu phẩy, tối đa 50) | 200 danh sách `{ user_id, full_name }`; id không tồn tại bị bỏ qua | 400, 401 |

Đổi vai trò hoặc xóa người dùng đều gửi sự kiện nhật ký (`ROLE_CHANGE`, `DELETE`). Đăng nhập thành công gửi `LOGIN`, đăng nhập sai gửi `LOGIN_FAILED`.

### 5.2 genealogy-service (Người 2)

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `GET /families` | Thành viên | Lọc `q` (tên chứa), `limit` (mặc định 50, tối đa 100), `offset` (mặc định 0); sort `family_name` hoặc `-family_name` (mặc định tăng dần) | 200 `Family[]`; `X-Total-Count` | 400, 401 |
| `GET /families/:id` | Thành viên | Không | 200 `Family` | 403, 404 |
| `POST /families` | Quản trị hệ thống | Body: `family_name`*, `description`, `origin_place` | 201 `Family` | 400, 403 |
| `PATCH /families/:id` | Quản trị dòng họ | `family_name`, `description`, `origin_place` | 200 `Family` | 400, 403, 404 |
| `DELETE /families/:id` | Quản trị hệ thống | Không | 200 null | 403, 404 |
| `GET /branches` | Thành viên | `family_id`*. `limit` (mặc định 50, tối đa 100), `offset` (mặc định 0). Sort `branch_name`, `-branch_name`; mặc định tăng dần | 200 `Branch[]`; `X-Total-Count` | 400, 403 |
| `GET /branches/:id` | Thành viên | Không | 200 `Branch` | 403, 404 |
| `POST /branches` | Quản trị dòng họ | `family_id`*, `branch_name`*, `description` | 201 `Branch` | 400, 403 |
| `PATCH /branches/:id` | Quản trị dòng họ | `branch_name`, `description` | 200 `Branch` | 400, 403, 404 |
| `DELETE /branches/:id` | Quản trị dòng họ | Không. Thành viên của nhánh được đặt `branch_id` là null | 200 null | 403, 404 |
| `GET /members` | Thành viên | `family_id`*. Lọc `branch_id`, `generation`, `gender`, `is_verified`, `occupation` (chứa), `address` (chứa), `q` (họ tên, nghề nghiệp hoặc địa chỉ chứa; không phân biệt hoa thường). `limit` (mặc định 50, tối đa 100), `offset` (mặc định 0). Sort `full_name`, `generation`, `date_of_birth` (thêm `-` để giảm dần); mặc định `generation` | 200 `Member[]`; `X-Total-Count` | 400, 403 |
| `GET /members/:id` | Thành viên | Không | 200 `Member` | 403, 404 |
| `POST /members` | Quản trị dòng họ | `family_id`*, `full_name`*, `gender` (mặc định OTHER), `branch_id`, `date_of_birth`, `date_of_death`, `generation`, `occupation`, `education`, `address`, `bio`. `date_of_death` không được trước `date_of_birth` | 201 `Member` | 400, 403 |
| `PATCH /members/:id` | Quản trị dòng họ | Như POST, trừ `family_id` | 200 `Member` | 400, 403, 404 |
| `DELETE /members/:id` | Quản trị dòng họ | Không. Xóa kèm quan hệ cha-con và hôn nhân của thành viên | 200 null | 403, 404 |
| `POST /members/:id/link-user` | Quản trị dòng họ | Body: `user_id`*. Gắn tài khoản vào thành viên | 200 `Member` | 400, 403, 404, 409 (thành viên đã gắn tài khoản, hoặc tài khoản đã gắn thành viên khác trong dòng họ) |
| `POST /members/:id/verify` | Quản trị dòng họ | Không có body. Đặt `is_verified` là true. Nếu thành viên đã gắn tài khoản vai trò GUEST thì `genealogy` gọi `auth` đổi thành FAMILY_MEMBER | 200 `Member` | 403, 404 |
| `GET /relationships` | Thành viên | Phải có ít nhất một trong `parent_member_id`, `child_member_id`, `member_id` (là cha hoặc con) | 200 `Relationship[]` | 400, 403 |
| `POST /relationships` | Quản trị dòng họ | `parent_member_id`*, `child_member_id`*, `relationship_type` (mặc định BIOLOGICAL). Hai thành viên phải cùng dòng họ, khác nhau và không tạo vòng tổ tiên | 201 `Relationship` | 400, 403, 404 (thành viên không tồn tại), 409 (cặp đã có) |
| `PATCH /relationships/:id` | Quản trị dòng họ | `relationship_type` | 200 `Relationship` | 400, 403, 404 |
| `DELETE /relationships/:id` | Quản trị dòng họ | Không | 200 null | 403, 404 |
| `GET /marriages` | Thành viên | `member_id`* (là một trong hai người) | 200 `Marriage[]` | 400, 403 |
| `POST /marriages` | Quản trị dòng họ | `spouse_1_member_id`*, `spouse_2_member_id`*, `marriage_date`, `status` (mặc định MARRIED). Hai id khác nhau và đều tồn tại | 201 `Marriage` | 400, 403, 404 |
| `PATCH /marriages/:id` | Quản trị dòng họ | `marriage_date`, `status` | 200 `Marriage` | 400, 403, 404 |
| `DELETE /marriages/:id` | Quản trị dòng họ | Không | 200 null | 403, 404 |
| `GET /tree` | Thành viên | `family_id`*. Tùy chọn: `branch_id`; `root_member_id` kèm `depth` (số thế hệ đi xuống, tối đa 10; bỏ trống là lấy hết) | 200 `{ family_id, nodes, edges }` (ví dụ ở mục 7) | 400, 403, 404 |
| `GET /relationships/query` | Thành viên | `from_member_id`*, `to_member_id`* (cùng dòng họ) | 200 `{ from_member_id, to_member_id, relation, path }`. `path` là danh sách `{ member_id, step }`, `step` là PARENT, CHILD hoặc SPOUSE. Nếu `relation` là NONE thì `path` rỗng. Hỗ trợ alias `GET /relation-query` | 400, 403, 404 |

### 5.3 community-service (Người 3)

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `GET /posts` | Thành viên | `family_id`*. Lọc `post_type`, `user_id`. Sort `created_at`; mặc định `-created_at` | 200 `Post[]` | 400, 403 |
| `GET /posts/:id` | Thành viên | Không | 200 `Post` | 403, 404 |
| `POST /posts` | Thành viên | `family_id`*, `content`*, `post_type` (mặc định GENERAL), `title` | 201 `Post` | 400, 403 |
| `PATCH /posts/:id` | Chính tác giả | `title`, `content`, `post_type` | 200 `Post` | 400, 403, 404 |
| `DELETE /posts/:id` | Tác giả | Không. Xóa kèm bình luận và cảm xúc của bài | 200 null | 403, 404 |
| `GET /comments` | Thành viên | `post_id`*. Sort `created_at`; mặc định tăng dần | 200 `Comment[]` | 400, 403 |
| `POST /comments` | Thành viên | `post_id`*, `content`* | 201 `Comment` | 400, 403, 404 |
| `PATCH /comments/:id` | Chính tác giả | `content` | 200 `Comment` | 400, 403, 404 |
| `DELETE /comments/:id` | Tác giả | Không | 200 null | 403, 404 |
| `GET /reactions` | Thành viên | `post_id`* | 200 `Reaction[]` | 400, 403 |
| `POST /reactions` | Thành viên | `post_id`*, `reaction_type` (mặc định LIKE). Mỗi người một cảm xúc cho mỗi bài: đã có thì đổi loại | 201 `Reaction` (tạo mới) hoặc 200 (đổi loại) | 400, 403, 404 |
| `DELETE /reactions/:id` | Chính người thả | Không | 200 null | 403, 404 |

Với bình luận và cảm xúc, service tra `post_id` để biết `family_id` rồi kiểm tra người gọi có thuộc dòng họ đó không.

### 5.4 event-service (Người 4)

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `GET /events` | Thành viên | `family_id`*. Lọc `from`, `to` (so với `start_time`), `upcoming=true` (từ bây giờ trở đi), `user_id`. Sort `start_time`; mặc định tăng dần | 200 `Event[]` | 400, 403 |
| `GET /events/:id` | Thành viên | Không | 200 `Event` | 403, 404 |
| `POST /events` | Thành viên | `family_id`*, `title`*, `start_time`*, `end_time`, `location`, `description`. `end_time` không được trước `start_time` | 201 `Event` | 400, 403 |
| `PATCH /events/:id` | Chính người tổ chức | `title`, `start_time`, `end_time`, `location`, `description` | 200 `Event` | 400, 403, 404 |
| `DELETE /events/:id` | Tác giả | Không. Xóa kèm các phản hồi RSVP | 200 null | 403, 404 |
| `GET /rsvps` | Thành viên | `event_id`*. Lọc `status`. Đây chính là danh sách người tham gia | 200 `Rsvp[]` | 400, 403 |
| `POST /rsvps` | Thành viên | `event_id`*, `status`*. Mỗi người một phản hồi cho mỗi sự kiện: đã có thì cập nhật | 201 `Rsvp` (tạo mới) hoặc 200 (cập nhật) | 400, 403, 404 |
| `DELETE /rsvps/:id` | Chính người phản hồi | Không | 200 null | 403, 404 |

Nhắc lịch là truy vấn `GET /events?family_id=...&upcoming=true&to=<ngày>`; frontend hiển thị, chưa có thông báo đẩy.

### 5.5 heritage-service (Người 4)

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `GET /heritages` | Thành viên | `family_id`*. Lọc `heritage_type`, `q` (tiêu đề hoặc nội dung chứa). Sort `created_at`; mặc định `-created_at` | 200 `Heritage[]` | 400, 403 |
| `GET /heritages/:id` | Thành viên | Không | 200 `Heritage` | 403, 404 |
| `POST /heritages` | Thành viên | `family_id`*, `heritage_type`*, `title`*, `content`, `file_url` (lấy từ kết quả upload) | 201 `Heritage` | 400, 403 |
| `PATCH /heritages/:id` | Chính người tải lên | `heritage_type`, `title`, `content`, `file_url` | 200 `Heritage` | 400, 403, 404 |
| `DELETE /heritages/:id` | Tác giả | Không. Xóa cả tệp đính kèm | 200 null | 403, 404 |
| `POST /heritages/upload` | FAMILY_MEMBER trở lên | `multipart/form-data`, trường `file`; JPG, PNG, WEBP hoặc PDF; tối đa 10 MB. Tên tệp lưu là chuỗi ngẫu nhiên | 201 `{ file_url, file_name, size, content_type }` | 400, 403, 413 |
| `GET /files/:name` | Đăng nhập | Không. Trả nội dung tệp (ngoại lệ không theo khuôn JSON). Frontend lấy bằng `ApiClient` rồi hiển thị, không dùng thẻ ảnh trỏ thẳng vì không gắn được header `Authorization` | 200 tệp | 401, 404 |

### 5.6 ai-service (Người 5)

Trong service này, "Thành viên" nghĩa là FAMILY_MEMBER trở lên; nếu request có `family_id` hoặc `member_id` thì còn phải thuộc dòng họ đó. Dữ liệu trả về chỉ nằm trong các dòng họ của người gọi. Giới hạn 20 request mỗi phút cho mỗi người dùng.

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `GET /ai/search` | Thành viên | `q`* (tối đa 200 ký tự), `family_id`*, `limit` (mặc định 10, tối đa 20) | 200 `{ query, mode, members, heritages }`. `mode` là KEYWORD hoặc SEMANTIC. `members` là danh sách `{ member_id, full_name, generation }`; `heritages` là danh sách `{ heritage_id, heritage_type, title }` | 400, 403, 429 |
| `POST /ai/assistant` | Thành viên | Body: `family_id`*, `question`* (tối đa 1.000 ký tự), `history` (tối đa 10 lượt `{ role, content }`, `role` là user hoặc assistant) | 200 `{ answer, sources }`. `sources` là danh sách `{ type, id, title }`, `type` là MEMBER hoặc HERITAGE | 400, 403, 429, 503 |
| `POST /ai/explain-relationship` | Thành viên | Body: `from_member_id`*, `to_member_id`* | 200 `{ relation, explanation, path }`. `explanation` là câu giải thích tiếng Việt; `relation` và `path` lấy từ `GET /relation-query` | 400, 403, 404, 429, 503 |
| `POST /ai/summarize` | Thành viên | Body: `text`* (tối đa 20.000 ký tự) | 200 `{ summary }` | 400, 429, 503 |
| `GET /ai/recommendations` | Thành viên | `member_id`*, `limit` (mặc định 5, tối đa 10) | 200 `{ member_id, related_members, resources }`. `related_members` là danh sách `{ member_id, full_name, reason }`; `resources` là danh sách `{ heritage_id, title, reason }` | 400, 403, 404, 429 |

### 5.7 report-service (Người 5)

| Endpoint | Quyền | Đầu vào | Thành công | Lỗi |
|---|---|---|---|---|
| `GET /dashboard/stats` | Thành viên | `family_id`* (SYSTEM_ADMIN bỏ trống để lấy toàn hệ thống) | 200 `{ generated_at, partial, unavailable_services, users, genealogy, community, events, heritage }`. Mỗi khối là số liệu của service tương ứng ở mục 6; `users` chỉ có với SYSTEM_ADMIN. Nếu một service lỗi thì khối đó là null, `partial` là true và tên service nằm trong `unavailable_services` | 400, 403 |
| `GET /dashboard/activity` | Thành viên | `family_id`*, `limit` (mặc định 20, tối đa 50) | 200 danh sách `{ activity_type, user_id, entity_id, family_id, created_at }`, mới nhất trước. `activity_type` là POST_CREATED, COMMENT_CREATED, EVENT_CREATED, RSVP_UPDATED hoặc HERITAGE_ADDED | 400, 403 |
| `GET /reports/family-summary` | Quản trị dòng họ | `family_id`* | 200 báo cáo tổng hợp: thống kê của dòng họ, 10 sự kiện sắp tới, số thành viên theo thế hệ. Frontend xuất CSV hoặc PDF từ dữ liệu này | 400, 403 |
| `GET /audit-logs` | Quản trị hệ thống | Lọc `user_id`, `action`, `entity_type`, `entity_id`, `from`, `to` (so với `created_at`). Sort `created_at`; mặc định `-created_at` | 200 `AuditLog[]` | 401, 403 |

## 6. Endpoint nội bộ

Gọi đồng bộ, timeout 3 giây, khuôn response giống API công khai. Khi cần, bên gọi chuyển tiếp `X-User-Id` và `X-User-Role` của người đang thao tác. Không có xác thực riêng vì chỉ gọi được trong mạng Docker. Các số liệu dạng `*_by_*` là đối tượng có đủ mọi giá trị enum làm khóa, giá trị 0 nếu không có.

| Endpoint | Cung cấp | Người gọi | Đầu vào | Trả về (`data`) |
|---|---|---|---|---|
| `GET /internal/users/:id` | auth | genealogy | Không | `{ user_id, full_name, role }` |
| `GET /internal/users` | auth | genealogy, report | `ids`* (tối đa 100) | Danh sách như trên |
| `PATCH /internal/users/:id/role` | auth | genealogy | Body: `role`* | `User`. genealogy chỉ gọi để nâng GUEST lên FAMILY_MEMBER khi xác minh thành viên; ghi nhật ký `ROLE_CHANGE` |
| `GET /internal/stats` | auth | report | Không | `{ users_count, users_by_role }` |
| `GET /internal/memberships` | genealogy | community, event, heritage, ai, report | `user_id`* | `{ user_id, memberships }`, một mục cho mỗi thành viên được liên kết với tài khoản; mỗi phần tử là `{ family_id, member_id, is_verified }`. Không có thành viên thì trả `memberships: []` |
| `GET /internal/members/:id` | genealogy | ai | Không | Một hồ sơ `Member`; 404 nếu không tồn tại |
| `GET /internal/members/search` | genealogy | ai | `q`*, `family_ids`* (cách nhau dấu phẩy), `limit` (mặc định 10) | Danh sách `{ member_id, full_name, generation, family_id }` |
| `GET /internal/relation-query` | genealogy | ai | `from_member_id`*, `to_member_id`* | Giống `GET /relation-query` |
| `GET /internal/stats` | genealogy | report | `family_id` (tùy chọn; bỏ trống để thống kê toàn hệ thống) | `{ families_count, branches_count, members_count, verified_members_count, members_by_gender, members_by_generation }`. `members_by_gender` luôn có `MALE`, `FEMALE`, `OTHER` (0 nếu không có); `members_by_generation` là đối tượng `{ "<generation>": count }`, bỏ qua generation chưa xác định. Family ID không tồn tại trả số liệu 0 |
| `GET /internal/stats` | community | report | `family_id` (tùy chọn) | `{ posts_count, comments_count, reactions_count, posts_by_type }` |
| `GET /internal/stats` | event | report | `family_id` (tùy chọn) | `{ events_count, upcoming_events_count, rsvps_by_status }` |
| `GET /internal/stats` | heritage | report | `family_id` (tùy chọn) | `{ heritage_count, heritage_by_type }` |
| `GET /internal/activity` | community, event, heritage | report | `family_id`*, `limit` | Danh sách `{ activity_type, user_id, entity_id, family_id, created_at }` |
| `GET /internal/heritages/search` | heritage | ai | `q`*, `family_ids`*, `limit` | Danh sách `{ heritage_id, heritage_type, title, family_id }` |
| `POST /internal/audit` | report | Mọi service | Body: `user_id`, `action`*, `entity_type`*, `entity_id`, `family_id` | 202 null. Bên gọi không chờ kết quả, lỗi chỉ ghi log. Không đưa mật khẩu, token hay nội dung bài viết vào nhật ký |

Mọi thao tác tạo, sửa, xóa ở các service đều gửi một sự kiện `POST /internal/audit`.

## 7. Ví dụ

Đăng nhập thành công (`POST /auth/login`):

```json
{ "success": true, "status_code": 200, "message": "Login successful", "data": { "user": { "user_id": "1", "email": "admin@familyconnect.local", "full_name": "Quản trị hệ thống", "phone": null, "role": "SYSTEM_ADMIN", "created_at": "2026-10-01T08:00:00.000Z", "updated_at": "2026-10-01T08:00:00.000Z" }, "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 28800 } }
```

Lỗi dữ liệu (`POST /members` thiếu tên và sai giới tính):

```json
{ "success": false, "status_code": 400, "message": "Validation failed", "data": { "code": "VALIDATION_ERROR", "fields": { "full_name": "required", "gender": "must be one of MALE, FEMALE, OTHER" } } }
```

Cây gia phả (`GET /tree?family_id=1`). Mỗi nút gồm `member_id`, `full_name`, `gender`, `date_of_birth`, `date_of_death`, `generation`, `branch_id`, `is_verified`. Mỗi cạnh có `type` là PARENT_CHILD hoặc MARRIAGE:

```json
{ "success": true, "status_code": 200, "message": "OK", "data": { "family_id": "1", "nodes": [ { "member_id": "1", "full_name": "Nguyễn Văn An", "gender": "MALE", "date_of_birth": "1930-01-15", "date_of_death": "2010-06-02", "generation": 1, "branch_id": "1", "is_verified": true }, { "member_id": "3", "full_name": "Nguyễn Văn Bình", "gender": "MALE", "date_of_birth": "1958-03-12", "date_of_death": null, "generation": 2, "branch_id": "1", "is_verified": true } ], "edges": [ { "type": "PARENT_CHILD", "relationship_id": "1", "parent_member_id": "1", "child_member_id": "3", "relationship_type": "BIOLOGICAL" }, { "type": "MARRIAGE", "marriage_id": "1", "spouse_1_member_id": "1", "spouse_2_member_id": "2", "status": "MARRIED" } ] } }
```

## 8. Bảng định tuyến của gateway

| Tiền tố | Service |
|---|---|
| `/auth`, `/users`, `/user-lookup` | auth |
| `/families`, `/branches`, `/members`, `/relationships`, `/marriages`, `/tree`, `/relation-query` | genealogy |
| `/posts`, `/comments`, `/reactions` | community |
| `/events`, `/rsvps` | event |
| `/heritages`, `/files` | heritage |
| `/ai` | ai |
| `/dashboard`, `/reports`, `/audit-logs` | report |

Route công khai không cần token: `POST /auth/register`, `POST /auth/login`, `GET /health`. Mọi đường dẫn bắt đầu bằng `/internal` bị gateway trả 404.

## 9. Chưa nằm trong phạm vi

- Quên mật khẩu, xác minh email, đổi mật khẩu: giao diện có liên kết "Quên mật khẩu?" nhưng chưa có endpoint.
- Thư viện ảnh của sự kiện: `event` chưa có trường ảnh; đề xuất dùng `heritage` loại PHOTO.
- Cấu hình hệ thống, sao lưu và khôi phục: làm bằng script, không có API.
- Nhật ký: `action`, `entity_type` và `audit_id` là phần bổ sung ngoài quy ước ban đầu; cần xác nhận và quy định giữ nhật ký bao lâu.
- Dữ liệu mồ côi khi xóa người dùng hoặc dòng họ (bài đăng, sự kiện còn `user_id`, `family_id` cũ).
- Thông báo đẩy khi nhắc lịch.

## Lịch sử thay đổi

| Ngày | Người | Thay đổi |
|---|---|---|
| | | Bản đề xuất đầu tiên |
