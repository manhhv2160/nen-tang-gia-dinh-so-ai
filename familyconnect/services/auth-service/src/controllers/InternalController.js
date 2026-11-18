const User = require('../models/User');

const MAX_BIGINT = 9223372036854775807n;

function parseUserId(value) {
    const userId = String(value ?? '');
    if (!/^[1-9]\d*$/.test(userId) || BigInt(userId) > MAX_BIGINT) {
        return null;
    }
    return userId;
}

function validationError(res, field) {
    return res.status(400).json({
        success: false,
        status_code: 400,
        message: 'Validation failed',
        data: { code: 'VALIDATION_ERROR', fields: { [field]: 'must be a positive BIGINT' } },
    });
}

function notFound(res) {
    return res.status(404).json({
        success: false,
        status_code: 404,
        message: 'User not found',
        data: { code: 'NOT_FOUND' },
    });
}

const InternalController = {
    getUser: async (req, res) => {
        const userId = parseUserId(req.params.id);
        if (!userId) return validationError(res, 'id');

        const user = await User.findById(userId);
        if (!user) return notFound(res);

        return res.status(200).json({
            success: true,
            status_code: 200,
            message: 'OK',
            data: user,
        });
    },

    promoteToFamilyMember: async (req, res) => {
        const userId = parseUserId(req.params.id);
        if (!userId) return validationError(res, 'id');
        if (req.body?.role !== 'FAMILY_MEMBER') {
            return res.status(400).json({
                success: false,
                status_code: 400,
                message: 'Only promotion to FAMILY_MEMBER is allowed',
                data: { code: 'VALIDATION_ERROR', fields: { role: 'must be FAMILY_MEMBER' } },
            });
        }

        const user = await User.findById(userId);
        if (!user) return notFound(res);

        const updatedUser = user.role === 'GUEST'
            ? await User.updateRole(userId, 'FAMILY_MEMBER')
            : user;
        if (!updatedUser) return notFound(res);

        return res.status(200).json({
            success: true,
            status_code: 200,
            message: 'User promoted to FAMILY_MEMBER',
            data: updatedUser,
        });
    },
};

module.exports = InternalController;
