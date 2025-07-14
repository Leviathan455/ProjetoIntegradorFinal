const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Middleware de proteção para todas as rotas de admin
router.use(authMiddleware, adminMiddleware);

// --- ROTAS DE USUÁRIOS E ESTATÍSTICAS ---
router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getStatistics);

// --- ROTAS DE CONVERSAS ---
router.get('/conversations', adminController.getAllConversations);
router.get('/conversations/:conversationId/messages', adminController.getConversationMessages);
router.get('/users/:userId/conversations', adminController.getUserConversations);

// --- ROTAS DE CHAMADOS (TICKETS) ---

// Rota para buscar os chamados de um usuário específico
router.get('/users/:userId/tickets', adminController.getTicketsByUser);

// NOVA ROTA: Busca todos os chamados para a aba principal de "Chamados"
router.get('/tickets', adminController.getAllTickets);


module.exports = router;