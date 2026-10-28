# Hợp đồng API (qua gateway, tiền tố /api/v1)

Cập nhật file này mỗi khi thêm hoặc đổi endpoint. `CRUD` nghĩa là GET danh sách, GET theo id, POST, PATCH, DELETE.

## auth-service (Người 1)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký (vai trò mặc định GUEST) |
| POST | `/auth/login` | Đăng nhập, trả JWT |
| GET | `/auth/me` | Thông tin người dùng hiện tại |
| GET | `/users` | Danh sách người dùng (FAMILY_ADMIN trở lên) |
| GET | `/users/:id` | Chi tiết người dùng |
| PATCH | `/users/:id` | Đổi vai trò/hồ sơ (SYSTEM_ADMIN) |
| DELETE | `/users/:id` | Xóa người dùng (SYSTEM_ADMIN) |

## genealogy-service (Người 2)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/families` | Dòng họ / gia đình |
| CRUD | `/branches` | Nhánh họ |
| CRUD | `/members` | Thành viên (lọc theo nghề nghiệp, nơi ở, thế hệ) |
| CRUD | `/relationships` | Quan hệ cha-con |
| CRUD | `/marriages` | Hôn nhân |
| GET | `/tree?family_id=` | Dữ liệu cây gia phả (nút + cạnh) |
| GET | `/relationships/query?from=&to=` | Truy vấn quan hệ giữa hai thành viên |

## community-service (Người 3)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/posts` | Bài đăng (NEWS | ANNOUNCEMENT | GENERAL) |
| CRUD | `/comments` | Bình luận (lọc theo post_id) |
| CRUD | `/reactions` | Thả cảm xúc, mỗi người một cảm xúc cho mỗi bài |

## event-service (Người 4)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/events` | Sự kiện dòng họ (start_time, end_time) |
| GET | `/events/upcoming` | Sự kiện sắp diễn ra / nhắc lịch |
| CRUD | `/rsvps` | Phản hồi tham gia (ATTENDING | DECLINED | MAYBE) |
| GET | `/events/:id/participants` | Danh sách người tham gia |

## heritage-service (Người 4)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/heritages` | Di sản số (HISTORICAL_DOC | STORY | OUTSTANDING_MEMBER | PHOTO) |
| POST | `/heritages/upload` | Tải tệp đính kèm lên |

## ai-service (Người 5)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/ai/search?q=` | Tìm kiếm ngữ nghĩa |
| POST | `/ai/assistant` | Trợ lý hỏi đáp về tri thức dòng họ |
| POST | `/ai/explain-relationship` | Giải thích quan hệ giữa hai thành viên |
| POST | `/ai/summarize` | Tóm tắt nội dung |
| GET | `/ai/recommendations?member_id=` | Gợi ý thành viên và tài liệu liên quan |

## report-service (Người 5)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/dashboard/stats` | Số liệu tổng hợp từ các service |
| GET | `/dashboard/activity` | Hoạt động cộng đồng gần đây |
| GET | `/audit-logs` | Nhật ký hệ thống (FAMILY_ADMIN trở lên) |
| GET | `/reports/export?type=` | Xuất báo cáo |
