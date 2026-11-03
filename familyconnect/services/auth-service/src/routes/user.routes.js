const express = require('express');
const router = express.Router();

const UserController = require('../controllers/UserController');

// Tạm thời tắt kiểm tra quyền để test API hoạt động trước
// const AuthGuard = require('../middleware/AuthGuard'); 
// const requireRole = require('../../../../shared/src/requireRole');

router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/:id/role', UserController.updateUserRole);
router.delete('/:id', UserController.deleteUser);

module.exports = router;