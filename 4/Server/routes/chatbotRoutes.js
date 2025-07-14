const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const authMiddleware = require('../middlewares/authMiddleware'); // <<-- CORRIGIDO: Agora aponta para 'middlewares' (com 's')

router.use(authMiddleware); // Aplica o middleware a TODAS as rotas abaixo neste router

// Rota para processar mensagens
router.post('/messages', chatbotController.processMessage);

// Rota para obter o histórico de UMA conversa específica
router.get('/conversations/:conversationId', chatbotController.getHistory);
router.get('/history/:conversationId', chatbotController.getHistory);

// NOVO: Rota para obter TODAS as conversas de um usuário logado
router.get('/conversations', chatbotController.getUserConversations); // <<-- ADICIONADA!

module.exports = router;