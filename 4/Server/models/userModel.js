const pool = require('../config/db');

module.exports = {
  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },

  async findByUsername(username) {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0];
  },

  async create(username, email, phone, passwordHash, isAdmin = false) {
    // Verifica se o usuário já existe
    const existingUser = await this.findByEmail(email) || await this.findByUsername(username);
    if (existingUser) { 
      throw new Error('Usuário já existe');
    }
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, phone, password_hash, is_admin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [username, email, phone, passwordHash, isAdmin]
    );
    return rows[0];
  },

  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, username, email, phone, created_at FROM users'
    );
    return rows;
  },

  async count() {
    const { rows } = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count, 10);
  }
};
