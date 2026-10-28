# Phân công

| Người | Service | Trang giao diện |
|---|---|---|
| Người 1 | gateway, auth, nền tảng frontend, docker-compose | index.html |
| Người 2 | genealogy | tree.html, members.html |
| Người 3 | community, shared, tài liệu API | feed.html |
| Người 4 | event, heritage | events.html, heritage.html |
| Người 5 | ai, report | dashboard.html, admin.html, ô hỏi AI trên tree.html |

Trang admin.html cần endpoint của auth (người dùng) và report (nhật ký): Người 1 và Người 5 thống nhất với nhau.
