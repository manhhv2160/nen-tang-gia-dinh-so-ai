# ai-service

Phụ trách: Người 5 · Cổng nội bộ: 3006 · Database: chưa cần

## Dữ liệu sở hữu
- Không có bảng quan hệ (có thể thêm chỉ mục tìm kiếm sau)

Không đọc bảng của service khác và không có khóa ngoại sang service khác.

## Endpoint công khai (qua gateway, tiền tố `/api/v1`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/ai/search?q=&family_id=` | Tìm kiếm trong dòng họ; `q` bắt buộc, giới hạn kết quả tối đa 20 |
| POST | `/ai/assistant` | Hỏi đáp về dòng họ (`family_id`, `question` bắt buộc; tối đa 10 lượt lịch sử) |
| POST | `/ai/explain-relationship` | Giải thích quan hệ (`from_member_id`, `to_member_id` bắt buộc) |
| POST | `/ai/summarize` | Tóm tắt văn bản (tối đa 20.000 ký tự) |
| GET | `/ai/recommendations?member_id=` | Gợi ý thành viên và di sản liên quan (tối đa 10 kết quả) |

## Endpoint nội bộ (`/internal`, gateway không công khai)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| | | Không có |

## Gọi tới service khác
- genealogy (memberships, tra cứu thành viên theo `family_ids`, hồ sơ thành viên và relation-query nội bộ)
- heritage (tra cứu di sản theo `family_ids`)

## Danh sách việc
- [ ] Model và bảng trong `db/init`
- [ ] Repository, Service, Controller, Route
- [ ] Endpoint `/internal` và `GET /health`
- [ ] Phân quyền theo header `X-User-Role` (xem docs/conventions.md)
- [ ] Cập nhật bảng endpoint trong README này và docs/api-contract.md
