# ai-service

Phụ trách: Người 5 · Cổng nội bộ: 3006 · Database: chưa cần

## Dữ liệu sở hữu
- Không có bảng quan hệ (có thể thêm chỉ mục tìm kiếm sau)

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/ai/search?q=` | Tìm kiếm ngữ nghĩa |
| POST | `/ai/assistant` | Trợ lý hỏi đáp về tri thức dòng họ |
| POST | `/ai/explain-relationship` | Giải thích quan hệ giữa hai thành viên |
| POST | `/ai/summarize` | Tóm tắt nội dung |
| GET | `/ai/recommendations?member_id=` | Gợi ý thành viên và tài liệu liên quan |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| | | Không có |

## Gọi tới service khác
- genealogy (/internal/members/search)
- heritage (/internal/heritages/search)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
