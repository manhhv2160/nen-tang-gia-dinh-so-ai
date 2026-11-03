# event-service

Phụ trách: Người 4 · Cổng nội bộ: 3004 · Database: event_db

## Dữ liệu sở hữu
- `event`
- `rsvp`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET, POST | `/events?family_id=` | Liệt kê sự kiện theo dòng họ (lọc theo thời gian, upcoming, người tổ chức) hoặc tạo sự kiện |
| GET, PATCH, DELETE | `/events/:id` | Xem sự kiện; người tổ chức sửa, người tạo xóa |
| GET | `/rsvps?event_id=` | Danh sách phản hồi/người tham gia (lọc theo trạng thái) |
| POST | `/rsvps` | Tạo hoặc cập nhật phản hồi (ATTENDING, DECLINED, MAYBE); mỗi người một phản hồi cho mỗi sự kiện |
| DELETE | `/rsvps/:id` | Xóa phản hồi của chính người đã gửi |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/stats?family_id=` | Số liệu cho dashboard (lọc dòng họ tùy chọn) |
| GET | `/internal/activity?family_id=&limit=` | Hoạt động sự kiện gần đây của dòng họ |

## Gọi tới service khác
- genealogy (kiểm tra người dùng thuộc dòng họ qua memberships)
- report (ghi nhật ký các thao tác tạo, sửa, xóa)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
