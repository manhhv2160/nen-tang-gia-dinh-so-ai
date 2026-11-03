// Controller: nhận request, gọi service, trả ApiResponse
const UserService = require('../services/UserService');

const UserController = {
    getAllUsers: async (req, res) => {
        try {
            const users = await UserService.getAllUsers();
            res.status(200).json({ success: true, status_code: 200, message: 'Lấy danh sách thành công', data: users });
        } catch (error) {
            res.status(500).json({ success: false, status_code: 500, message: error.message, data: null });
        }
    },

    getUserById: async (req, res) => {
        try {
            const user = await UserService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, status_code: 404, message: 'Không tìm thấy người dùng', data: null });
            }
            res.status(200).json({ success: true, status_code: 200, message: 'Thành công', data: user });
        } catch (error) {
            res.status(500).json({ success: false, status_code: 500, message: error.message, data: null });
        }
    },

    updateUserRole: async (req, res) => {
        try {
            const { role } = req.body;
            if (!role) throw new Error('Vui lòng cung cấp vai trò mới');
            
            const updatedUser = await UserService.updateUserRole(req.params.id, role);
            res.status(200).json({ success: true, status_code: 200, message: 'Cập nhật vai trò thành công', data: updatedUser });
        } catch (error) {
            res.status(400).json({ success: false, status_code: 400, message: error.message, data: null });
        }
    },

    deleteUser: async (req, res) => {
        try {
            await UserService.deleteUser(req.params.id);
            res.status(200).json({ success: true, status_code: 200, message: 'Xóa người dùng thành công', data: null });
        } catch (error) {
            res.status(500).json({ success: false, status_code: 500, message: error.message, data: null });
        }
    }
};

module.exports = UserController;