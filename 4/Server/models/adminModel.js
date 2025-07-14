const pool = require('../config/db');

module.exports = {
  // Buscar todos os usuários com dados principais
  async getAllUsers() {
    const { rows } = await pool.query(`
      SELECT id, username, email, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    return rows;
  },

  // Buscar todas as conversas de um usuário específico
  async getUserConversations(userId) {
    const { rows } = await pool.query(`
      SELECT id, user_id, started_at, last_activity
      FROM chat_conversations 
      WHERE user_id = $1 
      ORDER BY last_activity DESC
    `, [userId]);
    return rows;
  },

  // Buscar todas as mensagens de uma conversa
  async getConversationMessages(conversationId) {
    const { rows } = await pool.query(`
      SELECT sender_type, message_text, sent_at
      FROM chat_messages 
      WHERE conversation_id = $1 
      ORDER BY sent_at ASC
    `, [conversationId]);
    console.log(rows, conversationId);
    return rows;
  },

  // Buscar todas as conversas com nome de usuário incluído
  async getAllConversations() {
    const { rows } = await pool.query(`
      SELECT c.id, c.user_id, u.username, c.started_at, c.last_activity
      FROM chat_conversations c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.last_activity DESC
    `);
    return rows;
  },

  // Buscar estatísticas para o dashboard
  async getStatistics() {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const conversationsCount = await pool.query('SELECT COUNT(*) FROM chat_conversations');
    const messagesCount = await pool.query('SELECT COUNT(*) FROM chat_messages');

    return {
      users: parseInt(usersCount.rows[0].count),
      conversations: parseInt(conversationsCount.rows[0].count),
      messages: parseInt(messagesCount.rows[0].count)
    };
  }
};
