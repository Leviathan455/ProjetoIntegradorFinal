document.addEventListener('DOMContentLoaded', () => {
    // === ELEMENTOS DO DOM ===
    const welcomeHeader = document.getElementById('welcome-header');
    const usernameSpan = document.getElementById('username');
    const adminConfigBtn = document.getElementById('adminConfigBtn');
    const historySection = document.getElementById('history-section');
    const guestPrompt = document.getElementById('guest-prompt');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const chatHistoryList = document.getElementById('chat-history-list');
    const newChatButton = document.getElementById('new-chat-button');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // === ESTADO DA APLICAÇÃO ===
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    let conversationId = null;
    let currentFlowState = null; // Guarda o estado do fluxo de cadastro

    // === INICIALIZAÇÃO ===
    initialize();

    function initialize() {
        if (token && username) {
            setupAuthenticatedUser();
        } else {
            setupGuestUser();
        }
        setupEventListeners();
        startNewConversation(true); // Inicia uma conversa para todos
    }

    // --- LÓGICAS DE CONFIGURAÇÃO DE UI ---
    function setupAuthenticatedUser() {
        usernameSpan.textContent = username;
        historySection.style.display = 'flex';
        logoutBtn.style.display = 'block';
        guestPrompt.style.display = 'none';

        const decoded = parseJwt(token);
        if (decoded && (decoded.role === 'admin' || decoded.isAdmin)) {
            adminConfigBtn.style.display = 'block';
        }

        loadChatHistory();
    }

    function setupGuestUser() {
        usernameSpan.textContent = 'Convidado';
        guestPrompt.style.display = 'block';
        historySection.style.display = 'none';
        logoutBtn.style.display = 'none';
        adminConfigBtn.style.display = 'none';
    }

    // --- LÓGICA DO CHAT ---
    function startNewConversation(isInitial = false) {
        conversationId = null;
        currentFlowState = null; // Reseta o fluxo ao iniciar nova conversa
        chatMessages.innerHTML = '';
        addMessage('bot', 'Olá! Para se cadastrar, digite "cadastro". Como posso te ajudar hoje?');
        userInput.focus();

        if (token && !isInitial) {
            loadChatHistory();
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage('user', message);
        userInput.value = '';

        try {
            // Envia o estado do fluxo para o backend
            const data = await fetchApi('/api/chatbot/messages', {
                method: 'POST',
                body: JSON.stringify({
                    conversationId,
                    message,
                    flowState: currentFlowState
                })
            });
            
            addMessage('bot', data.response);

            // Recebe e armazena o novo estado do fluxo
            currentFlowState = data.flowState;

            // Se o usuário logado iniciar uma nova conversa, atualiza o histórico
            if (!conversationId && data.conversationId && token) {
                conversationId = data.conversationId;
                await loadChatHistory();
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            addMessage('bot', 'Desculpe, ocorreu um erro. Por favor, tente novamente.');
        }
    }

    // --- FUNÇÕES DE DADOS (API E HISTÓRICO) ---
    async function fetchApi(url, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            if (response.status === 401) { logout(); }
            throw new Error(`Erro na API: ${response.statusText}`);
        }
        return response.json();
    }

    async function loadChatHistory() {
        if (!token) return;
        try {
            const conversations = await fetchApi('/api/chatbot/conversations');
            chatHistoryList.innerHTML = '';
            (conversations || []).forEach(conv => {
                const listItem = document.createElement('li');
                // Usa diretamente o 'title' formatado que o backend envia
                listItem.textContent = conv.title || `Conversa #${conv.id}`;
                listItem.dataset.conversationId = conv.id;
                listItem.addEventListener('click', () => loadConversation(conv.id, listItem));
                chatHistoryList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    async function loadConversation(convId, listItem) {
        chatMessages.innerHTML = '<div class="message bot-message">Carregando...</div>';
        try {
            const messages = await fetchApi(`/api/chatbot/history/${convId}`);
            chatMessages.innerHTML = '';
            (messages || []).forEach(msg => addMessage(msg.sender_type, msg.message_text));
            conversationId = convId;

            // Lógica para destacar a conversa ativa na lista
            document.querySelectorAll('#chat-history-list li').forEach(li => li.classList.remove('active-conversation'));
            if(listItem) listItem.classList.add('active-conversation');

        } catch (error) {
            console.error('Erro ao carregar conversa:', error);
            addMessage('bot', 'Não foi possível carregar esta conversa.');
        }
    }

    // --- EVENT LISTENERS E FUNÇÕES UTILITÁRIAS ---
    function setupEventListeners() {
        sendButton.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        });
        
        if(logoutBtn) logoutBtn.addEventListener('click', logout);
        if(newChatButton) newChatButton.addEventListener('click', () => startNewConversation(false));
        if(menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    
    function logout() {
        localStorage.clear();
        window.location.href = 'index.html';
    }

    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerText = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }
});