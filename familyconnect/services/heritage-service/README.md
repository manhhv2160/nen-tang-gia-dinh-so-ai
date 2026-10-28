# heritage-service

Phụ trách: Người 4 · Cổng nội bộ: 3005 · Database: heritage_db

## Dữ liệu sở hữu
- `heritage`

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| CRUD | `/heritages` | Di sản số (HISTORICAL_DOC | STORY | OUTSTANDING_MEMBER | PHOTO) |
| POST | `/heritages/upload` | Tải tệp đính kèm lên |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/internal/heritages/search?q=` | Tìm tài liệu cho ai-service |
| GET | `/internal/stats` | Số liệu cho dashboard |

## Gọi tới service khác
- genealogy (kiểm tra người dùng thuộc family_id)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
