# event-service

Phụ trách: Người 4 · Cổng nội bộ: 3004 · Database: event_db

## Dữ liệu sở hữu
- `event`
- `rsvp`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/events` | Sự kiện dòng họ (start_time, end_time) |
| GET | `/events/upcoming` | Sự kiện sắp diễn ra / nhắc lịch |
| CRUD | `/rsvps` | Phản hồi tham gia (ATTENDING | DECLINED | MAYBE) |
| GET | `/events/:id/participants` | Danh sách người tham gia |

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
