const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuthMiddleware = require('../middlewares/optionalAuthMiddleware');

// Rota para processar mensagens (acesso público e de usuários logados)
// CORREÇÃO: Alterado 'handleMessage' para 'processMessage' para corresponder ao controller.
router.post('/messages', optionalAuthMiddleware, chatbotController.processMessage);

// Rota para obter TODAS as conversas de um usuário logado
router.get('/conversations', authMiddleware, chatbotController.getUserConversations);

// Rota para obter o histórico de UMA conversa específica
router.get('/history/:conversationId', authMiddleware, chatbotController.getHistory);

module.exports = router;