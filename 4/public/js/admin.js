document.addEventListener('DOMContentLoaded', () => {
    // === FUNÇÃO PARA SELECIONAR ELEMENTOS DE FORMA SEGURA ===
    const getElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Erro crítico: Elemento com ID '${id}' não foi encontrado no HTML.`);
        }
        return element;
    };

    // === ELEMENTOS DA INTERFACE ===
    const adminName = getElement('adminName');
    const logoutBtn = getElement('logoutBtn');
    const sectionLinks = document.querySelectorAll('[data-section]');
    const contentSections = document.querySelectorAll('.content-section');
    const mainContentArea = document.querySelector('.main-content');
    const usersCount = getElement('users-count');
    const conversationsCount = getElement('conversations-count');
    const ticketsCount = getElement('tickets-count');
    const usersTableBody = getElement('users-table')?.querySelector('tbody');
    const conversationsTableBody = getElement('conversations-table')?.querySelector('tbody');
    const ticketsTableBody = getElement('tickets-table')?.querySelector('tbody');
    const conversationDetailsDiv = getElement('conversation-details');
    const conversationsListDiv = getElement('conversations-list');
    const adminChatMessages = getElement('admin-chat-messages');
    const conversationIdSpan = getElement('conversation-id');
    const backToConversationsBtn = getElement('back-to-conversations');

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // === INICIALIZAÇÃO ===
    try {
        const decoded = parseJwt(token);
        if (adminName && decoded) {
            adminName.textContent = decoded.username || 'Administrador';
        }
    } catch (error) {
        console.error('Erro ao decodificar token:', error);
    }

    setupNavigationAndListeners();
    document.querySelector('[data-section="dashboard"]')?.click();

    // === CONFIGURAÇÃO DA NAVEGAÇÃO E EVENTOS ===
    function setupNavigationAndListeners() {
        sectionLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                showSection(sectionId);
            });
        });
        if (mainContentArea) {
            mainContentArea.addEventListener('click', handleMainContentClick);
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        if (backToConversationsBtn) {
            backToConversationsBtn.addEventListener('click', () => {
                if (conversationsListDiv) conversationsListDiv.style.display = 'block';
                if (conversationDetailsDiv) conversationDetailsDiv.style.display = 'none';
            });
        }
    }

    function showSection(sectionId) {
        sectionLinks.forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
        contentSections.forEach(s => s.style.display = 'none');
        const sectionElement = getElement(`${sectionId}-section`);
        if (sectionElement) {
            sectionElement.style.display = 'block';
        }

        switch (sectionId) {
            case 'dashboard': loadDashboard(); break;
            case 'users': loadUsers(); break;
            case 'conversations': loadAllConversations(); break;
            case 'tickets': loadAllTickets(); break;
        }
    }

    async function handleMainContentClick(event) {
        const target = event.target.closest('.btn');
        if (!target) return;
        const tr = target.closest('tr');

        if (target.classList.contains('view-conversations')) {
            await displayUserSubList('conversations', tr.dataset.userId);
        } else if (target.classList.contains('view-tickets')) {
            await displayUserSubList('tickets', tr.dataset.userId);
        } else if (target.classList.contains('view-messages')) {
            await displayConversationMessages(target.dataset.convid);
        }
    }

    // === FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ===
    async function fetchData(url) {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
        return response.json();
    }

    async function loadDashboard() {
        try {
            const data = await fetchData('/api/admin/stats');
            if (usersCount) usersCount.textContent = data.users || 0;
            if (conversationsCount) conversationsCount.textContent = data.conversations || 0;
            if (ticketsCount) ticketsCount.textContent = data.tickets || 0;
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    async function loadUsers() {
        if (!usersTableBody) return;
        try {
            const users = await fetchData('/api/admin/users');
            usersTableBody.innerHTML = '';
            users.forEach(user => {
                const row = usersTableBody.insertRow();
                row.dataset.userId = user.id;
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${new Date(user.created_at).toLocaleString('pt-BR')}</td>
                    <td class="actions-cell">
                        <button class="btn btn-primary view-conversations">Ver Conversas</button>
                        <button class="btn btn-info view-tickets">Ver Chamados</button>
                    </td>
                `;
            });
        } catch (error) { console.error('Erro ao carregar usuários:', error); }
    }

    async function loadAllConversations() {
        if (!conversationsTableBody) return;
        try {
            const conversations = await fetchData('/api/admin/conversations');
            renderConversationsTable(conversations, conversationsTableBody);
        } catch (error) { console.error('Erro ao carregar conversas:', error); }
    }

    async function loadAllTickets() {
        if (!ticketsTableBody) return;
        try {
            const tickets = await fetchData('/api/admin/tickets');
            renderTicketsTable(tickets, ticketsTableBody);
        } catch (error) { console.error('Erro ao carregar chamados:', error); }
    }

    async function displayUserSubList(type, userId) {
        showSection(type);
        const tableBody = type === 'conversations' ? conversationsTableBody : ticketsTableBody;
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="100%">Carregando...</td></tr>`;
        try {
            const data = await fetchData(`/api/admin/users/${userId}/${type}`);
            if (type === 'conversations') renderConversationsTable(data, tableBody);
            if (type === 'tickets') renderTicketsTable(data, tableBody);
        } catch (error) {
            console.error(`Erro ao carregar ${type} do usuário:`, error);
        }
    }

    function renderConversationsTable(conversations, tableBody) {
        tableBody.innerHTML = '';
        (conversations || []).forEach(conv => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${conv.id}</td>
                <td>${conv.username || conv.user_id}</td>
                <td>${new Date(conv.last_activity).toLocaleString('pt-BR')}</td>
                <td><button class="btn btn-secondary view-messages" data-convid="${conv.id}">Ver Mensagens</button></td>
            `;
        });
    }

    function renderTicketsTable(tickets, tableBody) {
        tableBody.innerHTML = '';
        (tickets || []).forEach(ticket => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${ticket.id}</td>
                <td>${ticket.username}</td>
                <td>${ticket.ticket_text || 'Não especificado'}</td>
                <td><span class="status status-${ticket.status || 'open'}">${ticket.status || 'Aberto'}</span></td>
                <td>${new Date(ticket.created_at).toLocaleString('pt-BR')}</td>
                <td><button class="btn btn-secondary view-messages" data-convid="${ticket.conversation_id}">Ver Mensagens</button></td>
            `;
        });
    }

    async function displayConversationMessages(conversationId) {
        if (!conversationsListDiv || !conversationDetailsDiv) return;
        showSection('conversations');
        conversationsListDiv.style.display = 'none';
        conversationDetailsDiv.style.display = 'block';
        if (adminChatMessages) adminChatMessages.innerHTML = 'Carregando...';
        try {
            const messages = await fetchData(`/api/admin/conversations/${conversationId}/messages`);
            if (conversationIdSpan) conversationIdSpan.textContent = conversationId;
            if (adminChatMessages) {
                adminChatMessages.innerHTML = '';
                (messages || []).forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.sender_type}-message`;
                    messageDiv.textContent = msg.message_text;
                    adminChatMessages.appendChild(messageDiv);
                });
                adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            if (adminChatMessages) adminChatMessages.innerHTML = '<p class="text-danger">Erro ao carregar mensagens.</p>';
        }
    }

    // === FUNÇÕES UTILITÁRIAS ===
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
        } catch (e) { return null; }
    }
});