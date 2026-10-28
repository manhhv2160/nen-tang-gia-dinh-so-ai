# gateway

Phụ trách: Người 1 · Cổng: 8080 (cổng duy nhất mở ra ngoài)

- Kiểm tra JWT, chuyển danh tính cho service qua `X-User-Id` và `X-User-Role`.
- Phải xóa mọi header `X-User-*` do client gửi lên trước khi tự gắn, nếu không ai cũng giả được vai trò.
- Không công khai đường dẫn `/internal/*`.
- Bảng định tuyến nằm ở `src/config/routes.js` và được mô tả trong `docs/api-contract.md`.
