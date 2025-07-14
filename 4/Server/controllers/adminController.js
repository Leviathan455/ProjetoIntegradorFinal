const AdminModel = require('../models/adminModel');
// O pool não é mais necessário aqui se todas as funções usarem o Model
// const pool = require('../config/db'); 

module.exports = {

    async getAllUsers(req, res) {
        try {
            // CORREÇÃO: Agora chama o Model, seguindo o padrão do resto do código.
            const users = await AdminModel.getAllUsers();
            res.json(users);
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
    },

    async getTicketsByUser(req, res) {
        try {
            const tickets = await AdminModel.getTicketsByUser(req.params.userId);
            res.json(tickets);
        } catch (error)
        {
            console.error('Erro no controller ao buscar chamados do usuário:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getAllTickets(req, res) {
        try {
            const tickets = await AdminModel.getAllTickets();
            res.json(tickets);
        } catch (error) {
            console.error('Erro ao buscar todos os chamados:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
};