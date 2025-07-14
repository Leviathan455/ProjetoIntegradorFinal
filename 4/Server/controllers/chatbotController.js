// Server/controllers/chatbotController.js
const ChatbotModel = require('../models/chatbotModel');
const { generateResponse } = require('../../chatbot/services/dialogFlow');

// Define os estados possíveis para o processo de criação de chamado
const TICKET_STATES = {
    NORMAL: 'normal',
    AWAITING_IDEA: 'awaiting_idea_description', // Resposta vai para ticket_text (cria o ticket aqui)
    AWAITING_FUNCTIONALITIES: 'awaiting_functionalities', // Resposta vai para functionalities
    AWAITING_DEADLINE: 'awaiting_deadline',     // Resposta vai para deadline
    AWAITING_BUDGET: 'awaiting_budget'         // Resposta vai para estimated_budget
};

// As perguntas que o bot fará em cada estado
const TICKET_QUESTIONS = {
    [TICKET_STATES.AWAITING_IDEA]: "Ótimo! Para começarmos seu orçamento/chamado, por favor, descreva a sua ideia com o máximo de detalhes possível.",
    [TICKET_STATES.AWAITING_FUNCTIONALITIES]: "Perfeito! Agora, quais funcionalidades você imagina para o seu projeto? (ex: login, catálogo, pagamentos, etc.)",
    [TICKET_STATES.AWAITING_DEADLINE]: "Certo. Qual o prazo ideal para conclusão do projeto? (ex: 3 meses, fim do ano, etc.)",
    [TICKET_STATES.AWAITING_BUDGET]: "Por último, você tem um orçamento estimado para este projeto? (ex: R$ 5.000, R$ R$ 10.000 - apenas uma estimativa)"
};

// Mapeia o estado para a COLUNA do banco de dados onde a resposta será salva.
// Note que 'AWAITING_IDEA' não está aqui, pois o ticket é CRIADO com essa resposta.
const TICKET_FIELD_MAPPING = {
    [TICKET_STATES.AWAITING_FUNCTIONALITIES]: 'functionalities',
    [TICKET_STATES.AWAITING_DEADLINE]: 'deadline',
    [TICKET_STATES.AWAITING_BUDGET]: 'estimated_budget'
};

module.exports = {
  async processMessage(req, res) {
    try {
      const { conversationId: clientConversationId, message } = req.body;
      const userId = req.user.id; // Assumido que req.user.id vem do seu middleware de autenticação
      let currentConversationId = clientConversationId;

      // Se não houver ID de conversa, cria uma nova
      if (!currentConversationId) {
        const newConversation = await ChatbotModel.createConversation(userId);
        currentConversationId = newConversation.id;
      }

      // Obtém o estado atual da conversa e o ID do ticket em andamento (se houver)
      const { state: conversationState, current_ticket_id: currentTicketId } = await ChatbotModel.getConversationState(currentConversationId);

      let botResponseText = '';
      let newConversationState = conversationState;
      let newTicketId = currentTicketId; // O ID do ticket que estamos trabalhando (pode ser null)

      // Salva a mensagem do usuário no histórico, independentemente do estado
      await ChatbotModel.saveMessage(currentConversationId, 'user', message);

      // --- Lógica de Cancelamento de Chamado (Verifica a qualquer momento, exceto estado NORMAL) ---
      const cancellationCheck = generateResponse(message);
      if (cancellationCheck.tag === 'cancelar_chamado' && conversationState !== TICKET_STATES.NORMAL) {
          botResponseText = cancellationCheck.response;
          newConversationState = TICKET_STATES.NORMAL; // Reseta o estado
          newTicketId = null; // Limpa o ID do ticket associado
          await ChatbotModel.updateConversationState(currentConversationId, newConversationState, newTicketId);
          await ChatbotModel.saveMessage(currentConversationId, 'bot', botResponseText);
          return res.json({
            response: botResponseText,
            conversationId: currentConversationId,
            ticketCancelled: true // Sinaliza para o frontend que o ticket foi cancelado
          });
      }

      // --- Lógica Principal de Gerenciamento de Estado ---
      switch (conversationState) {
        case TICKET_STATES.NORMAL:
          const initialIntent = generateResponse(message);
          if (initialIntent.tag === 'iniciar_chamado_orcamento') {
            botResponseText = TICKET_QUESTIONS[TICKET_STATES.AWAITING_IDEA];
            newConversationState = TICKET_STATES.AWAITING_IDEA; // Muda o estado para aguardar a ideia
          }
          // Garante que outras intenções sejam tratadas SEM iniciar um chamado
          else {
              botResponseText = initialIntent.response; // Usa a resposta da intenção (ou fallback)
              newConversationState = TICKET_STATES.NORMAL;
          }
          break;

        case TICKET_STATES.AWAITING_IDEA:
          // O usuário acabou de responder a "Descreva a sua ideia...".
          newTicketId = await ChatbotModel.createSupportTicket(userId, currentConversationId, message);
          // E imediatamente fazemos a próxima pergunta
          botResponseText = TICKET_QUESTIONS[TICKET_STATES.AWAITING_FUNCTIONALITIES];
          newConversationState = TICKET_STATES.AWAITING_FUNCTIONALITIES; // Muda o estado para aguardar funcionalidades
          break;

        case TICKET_STATES.AWAITING_FUNCTIONALITIES:
        case TICKET_STATES.AWAITING_DEADLINE:
        case TICKET_STATES.AWAITING_BUDGET:
          const fieldToUpdate = TICKET_FIELD_MAPPING[conversationState];
          if (newTicketId) {
            await ChatbotModel.updateTicketField(newTicketId, fieldToUpdate, message);
          } else {
            console.error(`Erro: newTicketId é null no estado ${conversationState}. Não foi possível salvar a resposta.`);
            botResponseText = "Desculpe, ocorreu um erro ao salvar sua resposta. Por favor, tente novamente iniciar um chamado.";
            newConversationState = TICKET_STATES.NORMAL;
            newTicketId = null;
            break;
          }

          let nextMessageForBot = ''; // Variável para a próxima pergunta ou a mensagem final completa

          if (conversationState === TICKET_STATES.AWAITING_FUNCTIONALITIES) {
            nextState = TICKET_STATES.AWAITING_DEADLINE;
            nextMessageForBot = TICKET_QUESTIONS[nextState];
          } else if (conversationState === TICKET_STATES.AWAITING_DEADLINE) {
            nextState = TICKET_STATES.AWAITING_BUDGET;
            nextMessageForBot = TICKET_QUESTIONS[nextState];
          } else { // Se este é o último passo (AWAITING_BUDGET)
              // Processo de preenchimento do ticket foi concluído.
              // Usamos uma string literal para a confirmação
              nextMessageForBot = "Seu chamado foi registrado com sucesso! Nossa equipe entrará em contato em breve para dar prosseguimento. Agradecemos o seu contato.";

              // Adiciona o menu principal.
              nextMessageForBot += "\n\nPosso te ajudar com mais alguma coisa?\n\n" +
                                   "1️⃣ Fazer Orçamento/Abrir Chamado\n" +
                                   "2️⃣ Saber mais sobre a Compact\n" +
                                   "3️⃣ Falar com atendente";

              newConversationState = TICKET_STATES.NORMAL; // Reseta o estado para normal
              newTicketId = null; // Limpa o ID do ticket, pois o processo foi finalizado.
          }

          botResponseText = nextMessageForBot; // Define a resposta final do bot
          // Atualiza o estado da conversa se não for o estado de finalização imediata
          if (newConversationState !== TICKET_STATES.NORMAL) {
             newConversationState = nextState;
          }
          break;

        default:
          // Caso um estado inesperado seja encontrado (erro ou corrupção de dados)
          console.warn(`Estado de conversa inesperado: ${conversationState}. Resetando para normal.`);
          botResponseText = "Desculpe, algo deu errado com o meu fluxo de conversa. Por favor, comece novamente ou digite 'menu'.";
          newConversationState = TICKET_STATES.NORMAL;
          newTicketId = null;
          break;
      }

      // Atualiza o estado da conversa e o ID do ticket associado no banco de dados, se houver mudança.
      if (conversationState !== newConversationState || currentTicketId !== newTicketId) {
        await ChatbotModel.updateConversationState(currentConversationId, newConversationState, newTicketId);
      }

      // Salva a resposta do bot no histórico
      await ChatbotModel.saveMessage(currentConversationId, 'bot', botResponseText);

      res.json({
        response: botResponseText,
        conversationId: currentConversationId,
        // Sinaliza para o frontend se o processo de criação de ticket foi COMPLETADO
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

  // NOVO: Método para obter todas as conversas de um usuário
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id; // ID do usuário logado, vindo do middleware de autenticação
      const conversations = await ChatbotModel.getConversationsByUserId(userId);

      // Você pode querer formatar isso para mostrar algo como "Conversa com Bot [Data]"
      const formattedConversations = conversations.map(conv => ({
        id: conv.id,
        // Exemplo de como formatar a data para exibição
        title: `Conversa em ${new Date(conv.created_at).toLocaleDateString('pt-BR')} - ${new Date(conv.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
      }));

      res.json(formattedConversations);
    } catch (error) {
      console.error('Erro ao obter conversas do usuário:', error);
      res.status(500).json({ error: 'Erro interno ao obter conversas.' });
    }
  }
};