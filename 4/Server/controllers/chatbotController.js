// Server/controllers/chatbotController.js
const ChatbotModel = require('../models/chatbotModel');
const UserModel = require('../models/userModel');
const { generateResponse } = require('../../chatbot/services/dialogFlow');
const bcrypt = require('bcryptjs');

// --- ESTADOS DE FLUXO ---
const REGISTRATION_STATES = {
    AWAITING_USERNAME: 'awaiting_username',
    CONFIRM_USERNAME: 'confirm_username',
    AWAITING_EMAIL: 'awaiting_email',
    CONFIRM_EMAIL: 'confirm_email',
    AWAITING_PHONE: 'awaiting_phone',
    CONFIRM_PHONE: 'confirm_phone',
    AWAITING_PASSWORD: 'awaiting_password'
};

const TICKET_STATES = {
    NORMAL: 'normal',
    AWAITING_IDEA: 'awaiting_idea_description',
    AWAITING_FUNCTIONALITIES: 'awaiting_functionalities',
    AWAITING_DEADLINE: 'awaiting_deadline',
    AWAITING_BUDGET: 'awaiting_budget'
};

// --- PERGUNTAS E MAPEAMENTOS ---
const TICKET_QUESTIONS = {
    [TICKET_STATES.AWAITING_IDEA]: "Ótimo! Para começarmos seu orçamento/chamado, por favor, descreva a sua ideia com o máximo de detalhes possível.",
    [TICKET_STATES.AWAITING_FUNCTIONALITIES]: "Perfeito! Agora, quais funcionalidades você imagina para o seu projeto? (ex: login, catálogo, pagamentos, etc.)",
    [TICKET_STATES.AWAITING_DEADLINE]: "Certo. Qual o prazo ideal para conclusão do projeto? (ex: 3 meses, fim do ano, etc.)",
    [TICKET_STATES.AWAITING_BUDGET]: "Por último, você tem um orçamento estimado para este projeto? (ex: R$ 5.000, R$ 10.000 - apenas uma estimativa)"
};

const TICKET_FIELD_MAPPING = {
    [TICKET_STATES.AWAITING_FUNCTIONALITIES]: 'functionalities',
    [TICKET_STATES.AWAITING_DEADLINE]: 'deadline',
    [TICKET_STATES.AWAITING_BUDGET]: 'estimated_budget'
};

// ===================================================================
// ===         FUNÇÃO AUXILIAR PARA O FLUXO DE CADASTRO            ===
// ===================================================================
async function handleRegistrationFlow(message, currentState) {
    const { step, data } = currentState;
    let responseText = '';
    let nextStep = step;
    let newData = { ...data };
    let registrationComplete = false;
    const userConfirmation = message.toLowerCase();

    if (step.includes('confirm_')) {
        if (userConfirmation === 'sim') {
            switch (step) {
                case REGISTRATION_STATES.CONFIRM_USERNAME:
                    responseText = "Qual é o seu melhor email?";
                    nextStep = REGISTRATION_STATES.AWAITING_EMAIL;
                    break;
                case REGISTRATION_STATES.CONFIRM_EMAIL:
                    responseText = "Opcional: Qual o seu telefone com DDD? (Se não quiser informar, digite 'pular')";
                    nextStep = REGISTRATION_STATES.AWAITING_PHONE;
                    break;
                case REGISTRATION_STATES.CONFIRM_PHONE:
                    responseText = "Agora, crie uma senha com pelo menos 6 caracteres.";
                    nextStep = REGISTRATION_STATES.AWAITING_PASSWORD;
                    break;
            }
        } else {
            switch (step) {
                case REGISTRATION_STATES.CONFIRM_USERNAME:
                    responseText = "Ok, sem problemas. Por favor, me diga o nome correto.";
                    nextStep = REGISTRATION_STATES.AWAITING_USERNAME;
                    newData.username = '';
                    break;
                case REGISTRATION_STATES.CONFIRM_EMAIL:
                    responseText = "Entendi. Por favor, informe o email correto.";
                    nextStep = REGISTRATION_STATES.AWAITING_EMAIL;
                    newData.email = '';
                    break;
                case REGISTRATION_STATES.CONFIRM_PHONE:
                    responseText = "Certo. Qual o telefone correto? (Ou digite 'pular')";
                    nextStep = REGISTRATION_STATES.AWAITING_PHONE;
                    newData.phone = '';
                    break;
            }
        }
    } else {
        switch (step) {
            case REGISTRATION_STATES.AWAITING_USERNAME:
                newData.username = message;
                responseText = `Seu nome é "${message}", correto? (sim/não)`;
                nextStep = REGISTRATION_STATES.CONFIRM_USERNAME;
                break;
            case REGISTRATION_STATES.AWAITING_EMAIL:
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message)) {
                    responseText = "Este email não parece válido. Por favor, tente outro.";
                } else {
                    const existingUser = await UserModel.findByEmail(message);
                    if (existingUser) {
                        responseText = "Este email já está cadastrado. Por favor, use outro ou faça o login.";
                    } else {
                        newData.email = message;
                        responseText = `O email será "${message}", correto? (sim/não)`;
                        nextStep = REGISTRATION_STATES.CONFIRM_EMAIL;
                    }
                }
                break;
            case REGISTRATION_STATES.AWAITING_PHONE:
                if (userConfirmation === 'pular') {
                    newData.phone = null;
                    responseText = "Entendido. Agora, crie uma senha com pelo menos 6 caracteres.";
                    nextStep = REGISTRATION_STATES.AWAITING_PASSWORD;
                } else {
                    newData.phone = message;
                    responseText = `Seu telefone é "${message}", correto? (sim/não)`;
                    nextStep = REGISTRATION_STATES.CONFIRM_PHONE;
                }
                break;
            case REGISTRATION_STATES.AWAITING_PASSWORD:
                if (message.length < 6) {
                    responseText = "Sua senha é muito curta. Ela precisa ter pelo menos 6 caracteres. Por favor, tente outra.";
                } else {
                    const salt = await bcrypt.genSalt(10);
                    newData.passwordHash = await bcrypt.hash(message, salt);
                    await UserModel.create(newData.username, newData.email, newData.phone, newData.passwordHash);
                    responseText = `Perfeito, ${newData.username}! Seu cadastro foi realizado com sucesso. Você já pode fazer o login para ter acesso a todas as funcionalidades.`;
                    nextStep = 'done';
                    registrationComplete = true;
                }
                break;
        }
    }
    const newFlowState = registrationComplete ? null : { type: 'registration', step: nextStep, data: newData };
    return { response: responseText, flowState: newFlowState };
}

// ===================================================================
// ===               CONTROLLER PRINCIPAL                          ===
// ===================================================================
module.exports = {
    async processMessage(req, res) {
        try {
            const { conversationId: clientConversationId, message, flowState } = req.body;
            const userId = req.user ? req.user.id : null;

            // --- LÓGICA PARA USUÁRIO CONVIDADO (SEM LOGIN) ---
            if (!userId) {
                if (flowState && flowState.type === 'registration') {
                    const registrationResponse = await handleRegistrationFlow(message, flowState);
                    return res.json(registrationResponse);
                }
                const intent = generateResponse(message);
                if (intent.tag === 'iniciar_cadastro') {
                    const initialFlowState = { type: 'registration', step: REGISTRATION_STATES.AWAITING_USERNAME, data: {} };
                    return res.json({
                        response: "Que ótimo! Vamos criar sua conta. Por favor, me diga seu nome completo.",
                        flowState: initialFlowState
                    });
                }
                if (intent.tag === 'iniciar_chamado_orcamento') {
                    return res.json({
                        response: 'Para criar um chamado ou orçamento, por favor, faça o login ou cadastre-se em nosso site.',
                        conversationId: null
                    });
                }
                return res.json({ response: intent.response, conversationId: null });
            }

            // --- FLUXO NORMAL PARA USUÁRIO LOGADO ---
            let currentConversationId = clientConversationId;
            if (!currentConversationId) {
                const newConversation = await ChatbotModel.createConversation(userId);
                currentConversationId = newConversation.id;
            }
            await ChatbotModel.saveMessage(currentConversationId, 'user', message);
            const { state: conversationState, current_ticket_id: currentTicketId } = await ChatbotModel.getConversationState(currentConversationId);
            let botResponseText = '';
            let newConversationState = conversationState;
            let newTicketId = currentTicketId;

            // Lógica de cancelamento
            const cancellationCheck = generateResponse(message);
            if (cancellationCheck.tag === 'cancelar_chamado' && conversationState !== TICKET_STATES.NORMAL) {
                botResponseText = cancellationCheck.response;
                newConversationState = TICKET_STATES.NORMAL;
                newTicketId = null;
                await ChatbotModel.updateConversationState(currentConversationId, newConversationState, newTicketId);
                await ChatbotModel.saveMessage(currentConversationId, 'bot', botResponseText);
                return res.json({
                    response: botResponseText,
                    conversationId: currentConversationId,
                    ticketCancelled: true
                });
            }

            // Lógica de criação de chamado
            let nextState = '';
            switch (conversationState) {
                case TICKET_STATES.NORMAL:
                    const initialIntent = generateResponse(message);
                    if (initialIntent.tag === 'iniciar_chamado_orcamento') {
                        botResponseText = TICKET_QUESTIONS[TICKET_STATES.AWAITING_IDEA];
                        newConversationState = TICKET_STATES.AWAITING_IDEA;
                    } else {
                        botResponseText = initialIntent.response;
                    }
                    break;
                case TICKET_STATES.AWAITING_IDEA:
                    newTicketId = await ChatbotModel.createSupportTicket(userId, currentConversationId, message);
                    botResponseText = TICKET_QUESTIONS[TICKET_STATES.AWAITING_FUNCTIONALITIES];
                    newConversationState = TICKET_STATES.AWAITING_FUNCTIONALITIES;
                    break;
                case TICKET_STATES.AWAITING_FUNCTIONALITIES:
                case TICKET_STATES.AWAITING_DEADLINE:
                case TICKET_STATES.AWAITING_BUDGET:
                    const fieldToUpdate = TICKET_FIELD_MAPPING[conversationState];
                    if (newTicketId) {
                        await ChatbotModel.updateTicketField(newTicketId, fieldToUpdate, message);
                    } else {
                        botResponseText = "Desculpe, ocorreu um erro. Por favor, tente iniciar um chamado novamente.";
                        newConversationState = TICKET_STATES.NORMAL;
                        newTicketId = null;
                        break;
                    }
                    if (conversationState === TICKET_STATES.AWAITING_FUNCTIONALITIES) {
                        nextState = TICKET_STATES.AWAITING_DEADLINE;
                        botResponseText = TICKET_QUESTIONS[nextState];
                    } else if (conversationState === TICKET_STATES.AWAITING_DEADLINE) {
                        nextState = TICKET_STATES.AWAITING_BUDGET;
                        botResponseText = TICKET_QUESTIONS[nextState];
                    } else {
                        botResponseText = "Seu chamado foi registrado com sucesso! Nossa equipe entrará em contato em breve.";
                        newConversationState = TICKET_STATES.NORMAL;
                        newTicketId = null;
                    }
                    if (newConversationState !== TICKET_STATES.NORMAL) {
                        newConversationState = nextState;
                    }
                    break;
                default:
                    botResponseText = "Desculpe, algo deu errado. Por favor, comece novamente.";
                    newConversationState = TICKET_STATES.NORMAL;
                    newTicketId = null;
                    break;
            }

            if (conversationState !== newConversationState || currentTicketId !== newTicketId) {
                await ChatbotModel.updateConversationState(currentConversationId, newConversationState, newTicketId);
            }
            await ChatbotModel.saveMessage(currentConversationId, 'bot', botResponseText);
            res.json({
                response: botResponseText,
                conversationId: currentConversationId,
                ticketCompleted: (conversationState === TICKET_STATES.AWAITING_BUDGET && newConversationState === TICKET_STATES.NORMAL)
            });
        } catch (error) {
            console.error('Erro ao processar mensagem do chatbot:', error);
            res.status(500).json({ error: 'Erro interno ao processar mensagem.' });
        }
    },

    async getHistory(req, res) {
        try {
            const history = await ChatbotModel.getConversationHistory(req.params.conversationId);
            res.json(history);
        } catch (error) {
            console.error('Erro ao obter histórico da conversa:', error);
            res.status(500).json({ error: 'Erro interno ao obter histórico.' });
        }
    },

    async getUserConversations(req, res) {
        try {
            const userId = req.user.id;
            const conversations = await ChatbotModel.getConversationsByUserId(userId);
            
            // CORREÇÃO: Usa o ID real da conversa para o título.
            const formattedConversations = conversations.map(conv => ({
                id: conv.id,
                title: `Conversa #${conv.id}`
            }));
            
            res.json(formattedConversations);
        } catch (error) {
            console.error('Erro ao obter conversas do usuário:', error);
            res.status(500).json({ error: 'Erro interno ao obter conversas.' });
        }
    }
};