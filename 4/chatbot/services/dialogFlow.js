// chatbot/services/dialogFlow.js
const intents = require('../intents/basicIntents.json');

function findIntent(message) {
  const lowerMsg = message.toLowerCase();
  for (const intent of intents.intents) {
    for (const pattern of intent.patterns) {
      if (lowerMsg.includes(pattern.toLowerCase())) {
        return intent; // Retorna o objeto da intenção inteira
      }
    }
  }
  return null; // Nenhuma intenção encontrada
}

function getRandomResponse(responses) {
  if (responses && responses.length > 0) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  return "Desculpe, não consegui gerar uma resposta.";
}

module.exports = {
  generateResponse: (message) => {
    const intent = findIntent(message);
    if (intent) {
      // Retornamos a tag junto com a resposta
      return {
        tag: intent.tag,
        response: getRandomResponse(intent.responses)
      };
    }
    // Se nenhuma intenção for encontrada, retornamos uma tag de fallback
    return {
      tag: "fallback",
      response: "Desculpe, não entendi. Poderia reformular ou escolher uma das opções?\n\n1️⃣ Fazer Orçamento/Abrir Chamado\n2️⃣ Saber mais sobre a Compact\n3️⃣ Falar com atendente"
    };
  }
};