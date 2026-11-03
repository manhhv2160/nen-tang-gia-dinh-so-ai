# report-service

Phụ trách: Người 5 · Cổng nội bộ: 3007 · Database: report_db

## Dữ liệu sở hữu
- `audit_log`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/dashboard/stats?family_id=` | Số liệu tổng hợp theo dòng họ; SYSTEM_ADMIN có thể bỏ trống để lấy toàn hệ thống |
| GET | `/dashboard/activity?family_id=` | Hoạt động gần đây của dòng họ |
| GET | `/reports/family-summary?family_id=` | Báo cáo tổng hợp của dòng họ (quản trị dòng họ; frontend xuất CSV/PDF) |
| GET | `/audit-logs` | Nhật ký hệ thống (SYSTEM_ADMIN; lọc theo người dùng, hành động, đối tượng và thời gian) |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/internal/audit` | Các service gửi sự kiện nhật ký; nhận 202, bên gọi không chờ kết quả |

## Gọi tới service khác
- auth (danh sách người dùng và thống kê), genealogy (memberships, thống kê và hoạt động), community, event, heritage (thống kê và hoạt động)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
