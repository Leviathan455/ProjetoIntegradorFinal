let lastConversationOrigin = 'conversations'; // ou 'users'

document.addEventListener('DOMContentLoaded', () => {
  // === ELEMENTOS DA INTERFACE ===
  const adminName = document.getElementById('adminName');
  const logoutBtn = document.getElementById('logoutBtn');
  const sectionLinks = document.querySelectorAll('[data-section]');
  const contentSections = document.querySelectorAll('.content-section');

  // Dashboard
  const usersCount = document.getElementById('users-count');
  const conversationsCount = document.getElementById('conversations-count');
  const messagesCount = document.getElementById('messages-count');

  // Seção de usuários
  const usersTable = document.getElementById('users-table').querySelector('tbody');

  // Seção de conversas
  const conversationsTable = document.getElementById('conversations-table').querySelector('tbody');
  const conversationDetails = document.getElementById('conversation-details');
  const conversationsList = document.getElementById('conversations-list');
  const adminChatMessages = document.getElementById('admin-chat-messages');
  const backToConversationsBtn = document.getElementById('back-to-conversations');

  // Recupera token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // === MOSTRA O NOME DO ADMIN (JWT) ===
  try {
    const decoded = parseJwt(token);
    adminName.textContent = decoded.username || 'Administrador';
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
  }

  // === NAVEGAÇÃO ENTRE SEÇÕES ===
  sectionLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');

      sectionLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      contentSections.forEach(s => s.style.display = 'none');
      document.getElementById(`${section}-section`).style.display = 'block';

      switch (section) {
        case 'dashboard': loadDashboard(); break;
        case 'users': loadUsers(); break;
        case 'conversations': loadConversations(); break;
      }
    });
  });

  // Carrega Dashboard por padrão
  document.querySelector('[data-section="dashboard"]').click();

  // === FUNÇÃO: SAIR ===
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
  });

  // === FUNÇÃO: Carregar estatísticas do Dashboard ===
  async function loadDashboard() {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao carregar estatísticas');
      const data = await response.json();
      usersCount.textContent = data.users;
      conversationsCount.textContent = data.conversations;
      messagesCount.textContent = data.messages;
    } catch (error) {
      console.error('Erro no dashboard:', error);
      alert('Erro ao carregar dados do dashboard');
    }
  }

  // === FUNÇÃO: Carregar usuários e montar tabela ===
  async function loadUsers() {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      const users = await response.json();
      renderUsersTable(users);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert('Erro ao carregar lista de usuários');
    }
  }

  // === FUNÇÃO: Renderizar tabela de usuários ===
  function renderUsersTable(users) {
    usersTable.innerHTML = '';

    users.forEach(user => {
      const userRow = document.createElement('tr');
      userRow.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td>${new Date(user.created_at).toLocaleString()}</td>
        <td>
          <button class="btn btn-primary view-conversations" data-userid="${user.id}">
            Ver Conversas
          </button>
        </td>
      `;
      usersTable.appendChild(userRow);

      const detailsRow = document.createElement('tr');
      detailsRow.classList.add('conversation-details-row');
      detailsRow.style.display = 'none';
      detailsRow.innerHTML = `<td colspan="5"><div class="user-conversations-table-container"></div></td>`;
      usersTable.appendChild(detailsRow);

      userRow.querySelector('.view-conversations').addEventListener('click', async () => {
        const userId = user.id;
        document.querySelectorAll('.conversation-details-row').forEach(row => {
          row.style.display = 'none';
          row.querySelector('.user-conversations-table-container').innerHTML = '';
        });

        try {
          const response = await fetch(`/api/admin/users/${userId}/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Erro ao carregar conversas do usuário');
          const conversations = await response.json();
          const container = detailsRow.querySelector('.user-conversations-table-container');
          container.innerHTML = renderMiniConversationsTable(conversations);
          detailsRow.style.display = '';
        } catch (error) {
          console.error('Erro ao carregar conversas do usuário:', error);
          alert('Erro ao carregar conversas do usuário');
        }
      });
    });
  }

  // === FUNÇÃO: Carregar todas as conversas ===
  async function loadConversations() {
    try {
      const response = await fetch('/api/admin/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao carregar conversas');
      const conversations = await response.json();
      renderConversationsTable(conversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      alert('Erro ao carregar lista de conversas');
    }
  }

  function renderConversationsTable(conversations) {
    conversationsTable.innerHTML = '';
    conversationsList.style.display = 'block';
    conversationDetails.style.display = 'none';

    conversations.forEach(conv => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${conv.id}</td>
        <td>${conv.user_id}</td>
        <td>${new Date(conv.last_activity).toLocaleString()}</td>
        <td>
          <button class="btn btn-primary view-messages" data-convid="${conv.id}" data-origin="conversations">Ver Mensagens</button>
        </td>
      `;
      conversationsTable.appendChild(row);
    });
  }

  // === CLIQUE EM BOTÕES "Ver Mensagens" (dinâmico) ===
  document.addEventListener('click', function (event) {
    if (event.target.classList.contains('view-messages')) {
      const convId = event.target.getAttribute('data-convid');
      const origin = event.target.getAttribute('data-origin') || 'conversations';
      viewConversationMessages(convId, origin);
    }
  });

  async function viewConversationMessages(conversationId, origin = 'conversations') {
    try {
      lastConversationOrigin = origin;

      sectionLinks.forEach(l => l.classList.remove('active'));
      document.querySelector('[data-section="conversations"]').classList.add('active');

      contentSections.forEach(s => s.style.display = 'none');
      document.getElementById('conversations-section').style.display = 'block';

      conversationsList.style.display = 'none';
      conversationDetails.style.display = 'block';

      const response = await fetch(`/api/admin/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erro ao carregar mensagens');
      const messages = await response.json();

      renderConversationMessages(conversationId, messages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      alert('Erro ao carregar mensagens da conversa');
    }
  }

  function renderConversationMessages(conversationId, messages) {
    conversationsList.style.display = 'none';
    conversationDetails.style.display = 'block';
    document.getElementById('conversation-id').textContent = conversationId;
    adminChatMessages.innerHTML = '';

    messages.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message', `${msg.sender_type}-message`);
      messageDiv.textContent = msg.message_text;
      adminChatMessages.appendChild(messageDiv);
    });

    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  }

  backToConversationsBtn.addEventListener('click', () => {
  conversationDetails.style.display = 'none';

  if (lastConversationOrigin === 'users') {
    sectionLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="users"]').classList.add('active');

    contentSections.forEach(s => s.style.display = 'none');
    document.getElementById('users-section').style.display = 'block';

    // Opcional: recarrega usuários para manter consistência
    loadUsers();
  } else {
    // Retorna para a lista de conversas
    conversationsList.style.display = 'block';
    conversationDetails.style.display = 'none';
  }
});


  function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  }

  function renderMiniConversationsTable(conversations) {
    if (conversations.length === 0) {
      return '<p>Nenhuma conversa encontrada.</p>';
    }
    let html = `
      <table class="mini-conv-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Última Atividade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
    `;
    conversations.forEach(conv => {
      html += `
        <tr>
          <td>${conv.id}</td>
          <td>${new Date(conv.last_activity).toLocaleString()}</td>
          <td>
            <button class="btn btn-secondary view-messages" data-convid="${conv.id}" data-origin="users">Ver Mensagens</button>
          </td>
        </tr>
      `;
    });
    html += '</tbody></table>';
    return html;
  }
});
