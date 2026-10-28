# Quy ước chung (đã chốt)

## Khóa chính và khóa ngoại: kiểu `BIGINT`
`user_id`, `member_id`, `family_id`, `branch_id`, `post_id`, `comment_id`, `reaction_id`, `event_id`, `rsvp_id`, `heritage_id`, `relationship_id`, `marriage_id`.
Trong JSON, ID là chuỗi (node-pg trả BIGINT dạng chuỗi). Giữa các service, ID chỉ là giá trị tham chiếu, không có khóa ngoại.
Cần bổ sung một ID cho nhật ký: `audit_id` (BIGINT), nhóm cần xác nhận.

## Thời gian
- `created_at`, `updated_at`, `start_time`, `end_time`: timestamp
- `date_of_birth`, `date_of_death`, `marriage_date`: date

## Vai trò (`role`)
`GUEST`, `FAMILY_MEMBER`, `FAMILY_ADMIN`, `SYSTEM_ADMIN`

## Enum cố định
- `gender`: MALE, FEMALE, OTHER
- `relationship_type`: BIOLOGICAL, ADOPTED
- MARRIAGE `status`: MARRIED, DIVORCED, WIDOWED
- `post_type`: NEWS, ANNOUNCEMENT, GENERAL
- `reaction_type`: LIKE, LOVE, HAHA, WOW, SAD, ANGRY
- RSVP `status`: ATTENDING, DECLINED, MAYBE
- `heritage_type`: HISTORICAL_DOC, STORY, OUTSTANDING_MEMBER, PHOTO

## Response chung cho mọi API
```json
{ "success": true, "status_code": 200, "message": "OK", "data": {} }
```
`success` boolean, `status_code` số nguyên (200, 201, 400, 401, 403, 404, 500), `message` chuỗi, `data` đối tượng hoặc mảng.

## Giữa các service
- Header `X-User-Id`, `X-User-Role` do gateway gắn; service không nhận danh tính từ nơi nào khác.
- Gọi nhau qua `/internal/...`, đồng bộ, có timeout, chuỗi gọi tối đa một tầng.
- Mọi service có `GET /health`.
