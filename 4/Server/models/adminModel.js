const pool = require('../config/db');

module.exports = {
  // Buscar todos os usuários com dados principais
  async getAllUsers() {
    const { rows } = await pool.query(`SELECT id, username, email, phone, created_at FROM users ORDER BY created_at DESC`);
    return rows;
  },

  async getUserConversations(userId) {
    const { rows } = await pool.query(`SELECT id, user_id, started_at, last_activity FROM chat_conversations WHERE user_id = $1 ORDER BY last_activity DESC`, [userId]);
    return rows;
  },

  async getConversationMessages(conversationId) {
    const { rows } = await pool.query(`SELECT sender_type, message_text, sent_at FROM chat_messages WHERE conversation_id = $1 ORDER BY sent_at ASC`, [conversationId]);
    return rows;
  },

  async getAllConversations() {
    const { rows } = await pool.query(`SELECT c.id, c.user_id, u.username, c.started_at, c.last_activity FROM chat_conversations c JOIN users u ON u.id = c.user_id ORDER BY c.last_activity DESC`);
    return rows;
  },
  
  async getStatistics() {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const conversationsCount = await pool.query('SELECT COUNT(*) FROM chat_conversations');
    const messagesCount = await pool.query('SELECT COUNT(*) FROM chat_messages');
    const ticketsCount = await pool.query('SELECT COUNT(*) FROM support_tickets');

    return {
      users: parseInt(usersCount.rows[0].count),
      conversations: parseInt(conversationsCount.rows[0].count),
      messages: parseInt(messagesCount.rows[0].count),
      tickets: parseInt(ticketsCount.rows[0].count),
    };
  },

  /**
   * CORRIGIDO: Agora esta função também busca o nome do usuário para consistência.
   */
  async getTicketsByUser(userId) {
    try {
      const query = `
        SELECT t.id, t.conversation_id, t.ticket_text, t.status, t.created_at, u.username
        FROM support_tickets t
        JOIN users u ON u.id = t.user_id
        WHERE t.user_id = $1 
        ORDER BY t.created_at DESC
      `;
      const { rows } = await pool.query(query, [userId]);
      return rows;
    } catch (error) {
      console.error("Erro no model ao buscar chamados do usuário:", error);
      throw new Error('Erro ao acessar o banco de dados para buscar chamados.');
    }
  },

  async getAllTickets() {
    const { rows } = await pool.query(`
      SELECT t.id, t.user_id, t.conversation_id, t.ticket_text, t.status, t.created_at, u.username
      FROM support_tickets t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
    `);
    return rows;
  }
};