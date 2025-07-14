document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const usernameEl = document.getElementById('username');
    const adminConfigBtn = document.getElementById('adminConfigBtn');
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const chatHistoryList = document.getElementById('chat-history-list');
    const newChatButton = document.getElementById('new-chat-button');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // --- ESTADO DA APLICAÇÃO ---
    const token = localStorage.getItem('token');
    let conversationId = null;
    let activeConversationElement = null;

    // --- FUNÇÕES DE INICIALIZAÇÃO E AUTENTICAÇÃO ---
    function initialize() {
        const username = localStorage.getItem('username');
        if (!username || !token) {
            logout();
            return;
        }
        
        usernameEl.textContent = username;
        setupAdminView(token);
        setupEventListeners();
        loadChatHistory();
    }
    
    function logout() {
        localStorage.clear();
        window.location.href = 'index.html';
    }
    
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (err) {
            console.error('Erro ao decodificar token:', err);
            return null;
        }
    }

    function setupAdminView(token) {
        const decoded = parseJwt(token);
        const isAdmin = decoded && (decoded.role === 'admin' || decoded.permissao === 'admin' || decoded.isAdmin === true);
        if (!isAdmin && adminConfigBtn) {
            adminConfigBtn.style.display = 'none';
        }
    }

    // --- FUNÇÕES AUXILIARES E DE UI ---
    function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        // Para renderizar quebras de linha corretamente
        messageDiv.innerText = text; 
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatDateTime(dateString) {
        if (!dateString) return 'Data desconhecida';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Data Inválida';
        }
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function createConversationListItem(conv) {
        const listItem = document.createElement('li');
        listItem.textContent = conv.last_message_time ? `Conversa em ${formatDateTime(conv.last_message_time)}` : `Conversa ${conv.id}`;
        listItem.dataset.conversationId = conv.id;
        listItem.tabIndex = 0; // Para acessibilidade
        listItem.addEventListener('click', () => loadConversation(conv.id, listItem));
        listItem.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadConversation(conv.id, listItem);
        });
        return listItem;
    }

    // --- LÓGICA PRINCIPAL DO CHAT ---
    async function fetchApi(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        const response = await fetch(url, { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...options.headers } });

        if (response.status === 401) {
            console.error('Sessão expirada ou não autorizado.');
            logout();
            throw new Error('Não autorizado');
        }
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText || response.status}`);
        }
        return response.json();
    }
    
    async function loadChatHistory() {
        try {
            const conversations = await fetchApi('/api/chatbot/conversations');
            chatHistoryList.innerHTML = '';

            if (conversations.length === 0) {
                chatHistoryList.innerHTML = '<li>Nenhuma conversa.</li>';
                startNewConversation(true);
                return;
            }

            conversations.sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));
            
            conversations.forEach(conv => {
                const listItem = createConversationListItem(conv);
                chatHistoryList.appendChild(listItem);
            });

            if (conversations.length > 0 && !conversationId) {
                chatHistoryList.querySelector(`[data-conversation-id="${conversations[0].id}"]`)?.click();
            }
        } catch (error) {
            console.error('Erro ao carregar histórico de conversas:', error);
            chatHistoryList.innerHTML = '<li>Erro ao carregar.</li>';
        }
    }

    async function loadConversation(convId, listItemElement) {
        chatMessages.innerHTML = '<div class="message bot-message">Carregando mensagens...</div>';
        
        try {
            const messages = await fetchApi(`/api/chatbot/history/${convId}`);
            chatMessages.innerHTML = '';
            messages.forEach(msg => addMessage(msg.sender_type, msg.message_text));
            conversationId = convId;

            if (activeConversationElement) {
                activeConversationElement.classList.remove('active-conversation');
            }
            listItemElement.classList.add('active-conversation');
            activeConversationElement = listItemElement;
        } catch (error) {
            console.error('Erro ao carregar conversa:', error);
            addMessage('bot', 'Desculpe, não foi possível carregar esta conversa.');
        }
    }
    
    function startNewConversation(initial = false) {
        conversationId = null;
        chatMessages.innerHTML = '';
        if (activeConversationElement) {
            activeConversationElement.classList.remove('active-conversation');
            activeConversationElement = null;
        }
        addMessage('bot', 'Olá! Seja bem-vindo à Compact! 😊\n\nComo posso te ajudar?\n\n1️⃣ Fazer Orçamento/Abrir Chamado\n2️⃣ Saber mais sobre a Compact\n3️⃣ Falar com atendente');
        userInput.focus();

        if (!initial) {
           loadChatHistory();
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage('user', message);
        userInput.value = '';

        try {
            const data = await fetchApi('/api/chatbot/messages', {
                method: 'POST',
                body: JSON.stringify({ conversationId, message })
            });
            
            addMessage('bot', data.response);

            if (!conversationId && data.conversationId) { // Se era uma nova conversa
                await loadChatHistory(); // Recarrega o histórico para mostrar a nova conversa
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            addMessage('bot', 'Desculpe, ocorreu um erro. Tente novamente.');
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        logoutBtn.addEventListener('click', logout);
        newChatButton.addEventListener('click', () => startNewConversation(false));
        sendButton.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        // Lógica para o menu mobile
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // --- INICIA A APLICAÇÃO ---
    initialize();
});