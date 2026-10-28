# FamilyConnect

Nền tảng cộng đồng gia đình số, theo mô hình microservice.

```
docker compose up --build     # web: http://localhost:3000, gateway: http://localhost:8080
```

Hiện chỉ là bộ khung: các file `.js` trong `src/` mới có một dòng ghi chú vai trò, nên `docker compose up` sẽ chưa chạy được cho tới khi giai đoạn 0 (mỗi service trả `GET /health`, gateway định tuyến) hoàn thành.

- `docs/` quy ước, hợp đồng API, phân công, kiến trúc
- `services/<tên>-service/README.md` bảng sở hữu và endpoint của từng service
- `web/` giao diện (HTML, CSS, JavaScript)
