const app = require('./app');
const createUsersTable = require('./models/initDB.js');
const seedDefaultUsers = require('./models/seedDefaultUsers.js');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
    // Chạy lệnh tạo bảng trước khi mở cổng
    await createUsersTable();
    await seedDefaultUsers();

    app.listen(PORT, () => {
        console.log(`🔑 Auth Service đang chạy tại http://localhost:${PORT}`);
    });
};

startServer().catch((error) => {
    console.error('❌ Auth Service không thể khởi động:', error);
    process.exit(1);
});