// Model User: user_id, email, password_hash, full_name, role, created_at, updated_at
const pool = require('../config/db');

class User {
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await pool.query(query, [email]);
        return rows[0]; // Trả về user đầu tiên tìm thấy hoặc undefined
    }

    static async create(userData) {
        const { username, email, password } = userData;
        const query = `
            INSERT INTO users (full_name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING user_id, full_name, email, created_at;
        `;
        const values = [username, email, password];
        const { rows } = await pool.query(query, values);
        return rows[0]; // Trả về thông tin user vừa tạo
    }

    // Lấy user theo id (không trả password_hash)
    static async findById(userId) {
        const query = `
            SELECT user_id, email, full_name, role, created_at, updated_at
            FROM users WHERE user_id = $1;
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows[0];
    }

    // Lấy danh sách tất cả user (không trả password_hash)
    static async findAll() {
        const query = `
            SELECT user_id, email, full_name, role, created_at, updated_at
            FROM users ORDER BY created_at DESC;
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    // Cập nhật vai trò người dùng
    static async updateRole(userId, role) {
        const query = `
            UPDATE users 
            SET role = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = $2 
            RETURNING user_id, email, full_name, role, updated_at;
        `;
        const { rows } = await pool.query(query, [role, userId]);
        return rows[0];
    }

    // Xóa người dùng
    static async delete(userId) {
        const query = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id;';
        const { rows } = await pool.query(query, [userId]);
        return rows[0];
    }
}

module.exports = User;