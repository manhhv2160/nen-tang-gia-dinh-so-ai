const bcrypt = require('bcrypt');
const pool = require('../config/db.js');

const seedDefaultUsers = async () => {
    if (process.env.SEED_DEFAULT_USERS !== 'true') {
        return;
    }

    const users = [
        {
            fullName: 'FamilyConnect Admin',
            email: process.env.DEFAULT_ADMIN_EMAIL,
            password: process.env.DEFAULT_ADMIN_PASSWORD,
            role: 'SYSTEM_ADMIN',
        },
        {
            fullName: 'FamilyConnect Test User',
            email: process.env.DEFAULT_TEST_EMAIL,
            password: process.env.DEFAULT_TEST_PASSWORD,
            role: 'GUEST',
        },
    ];

    for (const user of users) {
        if (!user.email || !user.password) {
            throw new Error(`Missing email or password for default ${user.role} account`);
        }

        const passwordHash = await bcrypt.hash(user.password, 10);
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email) DO NOTHING
             RETURNING user_id`,
            [user.fullName, user.email, passwordHash, user.role]
        );

        if (result.rowCount === 1) {
            console.info(`Seeded default ${user.role} account: ${user.email}`);
        } else {
            console.info(`Default ${user.role} account already exists; left unchanged: ${user.email}`);
        }
    }
};

module.exports = seedDefaultUsers;
