# shared

Phụ trách: Người 3. Code dùng chung cho mọi service. Mọi service import bằng đường dẫn tương đối (ví dụ `../../../shared/src/ApiResponse.js` từ `services/<tên>/src/x.js`); cấu trúc thư mục trong Docker image giống hệt repo nên cùng đường dẫn chạy được cả hai nơi.

Chỉ đặt vào đây thứ thật sự dùng chung. Thay đổi ở đây ảnh hưởng mọi service, nên cần báo cả nhóm.
