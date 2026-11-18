const express = require('express');
const InternalController = require('../controllers/InternalController');

const router = express.Router();

router.get('/users/:id', InternalController.getUser);
router.patch('/users/:id/role', InternalController.promoteToFamilyMember);

module.exports = router;
