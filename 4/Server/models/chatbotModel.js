const pool = require('../config/db');

module.exports = {
  async createConversation(userId) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO chat_conversations (user_id, state)
         VALUES ($1, 'normal')
         RETURNING *`,
        [userId]
      );
      return rows[0];
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      throw error;
    }
  },

  async saveMessage(conversationId, sender, message) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO chat_messages (conversation_id, sender_type, message_text)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [conversationId, sender, message]
      );
      return rows[0];
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  },

  async getConversationHistory(conversationId) {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM chat_messages
         WHERE conversation_id = $1
         ORDER BY sent_at ASC`,
        [conversationId]
      );
      return rows;
    } catch (error) {
      console.error('Erro ao obter histórico da conversa:', error);
      throw error;
    }
  },

  /**
   * Retorna todas as conversas do usuário, ordenadas pela data da última mensagem.
   * Se uma conversa não tiver mensagens ainda, será listada por último.
   */
  async getConversationsByUserId(userId) {
    try {
      const query = `
        SELECT c.id, c.user_id, c.state, c.current_ticket_id,
               MAX(m.sent_at) AS last_message_time
        FROM chat_conversations c
        LEFT JOIN chat_messages m ON c.id = m.conversation_id
        WHERE c.user_id = $1
        GROUP BY c.id, c.user_id, c.state, c.current_ticket_id
        ORDER BY last_message_time DESC NULLS LAST;
      `;
      const { rows } = await pool.query(query, [userId]);
      return rows;
    } catch (error) {
      console.error('Erro no getConversationsByUserId (Modelo):', error);
      throw error;
    }
  },

  /**
   * Retorna o estado atual e o ID do ticket da conversa.
   */
  async getConversationState(conversationId) {
    try {
      const { rows } = await pool.query(
        `SELECT state, current_ticket_id FROM chat_conversations WHERE id = $1`,
        [conversationId]
      );
      return rows.length > 0 ? rows[0] : { state: 'normal', current_ticket_id: null };
    } catch (error) {
      console.error('Erro ao obter estado da conversa:', error);
      throw error;
    }
  },

  /**
   * Atualiza o estado e o ticket da conversa.
   */
  async updateConversationState(conversationId, newState, currentTicketId = null) {
    try {
      await pool.query(
        `UPDATE chat_conversations
         SET state = $1, current_ticket_id = $2
         WHERE id = $3`,
        [newState, currentTicketId, conversationId]
      );
    } catch (error) {
      console.error('Erro ao atualizar estado da conversa:', error);
      throw error;
    }
  },

  /**
   * Cria um ticket de suporte vinculado à conversa.
   */
  async createSupportTicket(userId, conversationId, ideaDescription) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO support_tickets (user_id, conversation_id, ticket_text)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [userId, conversationId, ideaDescription]
      );
      return rows[0].id;
    } catch (error) {
      console.error('Erro ao criar ticket de suporte:', error);
      throw error;
    }
  },

  /**
   * Atualiza um campo específico do ticket.
   */
  async updateTicketField(ticketId, fieldName, value) {
    try {
      // AVISO: Proteja contra SQL Injection validando fieldName no controller
      const query = `UPDATE support_tickets SET ${fieldName} = $1 WHERE id = $2`;
      await pool.query(query, [value, ticketId]);
    } catch (error) {
      console.error(`Erro ao atualizar campo '${fieldName}' do ticket:`, error);
      throw error;
    }
  }
};
