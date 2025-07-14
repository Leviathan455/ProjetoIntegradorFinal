const AdminModel = require('../models/adminModel');
const pool = require('../config/db');

module.exports = {


  
  async getAllUsers(req, res) {
    try {
      const { rows } = await pool.query('SELECT * FROM users');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },


  async getUserConversations(req, res) {
    try {
      const conversations = await AdminModel.getUserConversations(req.params.userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getConversationMessages(req, res) {
  try {
      console.log(req.params.conversationId);
      const messages = await AdminModel.getConversationMessages(req.params.conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },


  async getStatistics(req, res) {
  try {
      const stats = await AdminModel.getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAllConversations(req, res) {
  try {
      const conversations = await AdminModel.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      res.status(500).json({ error: 'Erro interno ao buscar conversas' });
    }
  }
};
