// Khởi động gateway (cổng 8080)
const app = require('./app.js');

const PORT = process.env.PORT || 8080; 

app.listen(PORT, () => {
    console.log(`🚀 API Gateway đang chạy tại http://localhost:${PORT}`);
});