# report-service

Phụ trách: Người 5 · Cổng nội bộ: 3007 · Database: report_db

## Dữ liệu sở hữu
- `audit_log`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/dashboard/stats` | Số liệu tổng hợp từ các service |
| GET | `/dashboard/activity` | Hoạt động cộng đồng gần đây |
| GET | `/audit-logs` | Nhật ký hệ thống (FAMILY_ADMIN trở lên) |
| GET | `/reports/export?type=` | Xuất báo cáo |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/internal/audit` | Các service gửi sự kiện nhật ký (không chờ phản hồi) |

## Gọi tới service khác
- auth, genealogy, community, event, heritage (/internal/stats)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
