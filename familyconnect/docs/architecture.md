# Kiến trúc

```
Trình duyệt -> web (nginx :3000) --/api/--> gateway (:8080) --> auth | genealogy | community | event | heritage | ai | report
                                                                  \______ mỗi service dùng database riêng trong PostgreSQL ______/
```

Quy tắc: mỗi service chỉ đọc database của mình; chỉ gateway mở ra ngoài; service gọi nhau qua `/internal/...`.
Thêm sơ đồ chi tiết, danh sách service phụ thuộc và quyết định kỹ thuật vào file này khi nhóm chốt.
