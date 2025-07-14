const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Middleware de proteção
router.use(authMiddleware, adminMiddleware);

// Rota correta para as estatísticas
router.get('/conversations', adminController.getAllConversations);

router.get('/conversations/:conversationId/messages', adminController.getConversationMessages);
router.get('/users/:userId/conversations', adminController.getUserConversations);
router.get('/users', adminController.getAllUsers);
router.get('/stats', adminController.getStatistics);

module.exports = router;
