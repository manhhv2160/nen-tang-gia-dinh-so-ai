// Service: nghiệp vụ và kiểm tra dữ liệu
const User = require('../models/User');

const UserService = {
    getAllUsers: async () => {
        // Hàm này lấy toàn bộ user từ model, cần định nghĩa trong User.js
        return await User.findAll();
    },

    getUserById: async (userId) => {
        return await User.findById(userId);
    },

    updateUserRole: async (userId, newRole) => {
        // Hàm này gọi update, cần định nghĩa trong User.js
        return await User.updateRole(userId, newRole);
    },

    deleteUser: async (userId) => {
        // Hàm này gọi delete, cần định nghĩa trong User.js
        return await User.delete(userId);
    }
};

module.exports = UserService;