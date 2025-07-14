document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const registerBtn = document.getElementById('registerBtn');
  const successMessage = document.getElementById('successMessage');

  function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
  }

  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
      el.style.display = 'none';
    });
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    successMessage.style.display = 'none';

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validações
    if (username.length < 3) {
      return showError('usernameError', 'Nome deve ter pelo menos 3 caracteres');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError('emailError', 'Por favor, insira um email válido');
    }

    if (phone.length > 0 && !/^(\(?\d{2}\)?\s?\d{4,5}-?\d{4})$/.test(phone)) {
      return showError('phoneError', 'Telefone inválido. Ex: (55) 99999-9999 ou 55999999999');
    }

    if (phone.length > 20) {
      return showError('phoneError', 'Telefone muito longo. Máximo 20 caracteres.');
    } 

    if (password.length < 6) {
      return showError('passwordError', 'A senha deve ter pelo menos 6 caracteres');
    }

    if (password !== confirmPassword) {
      return showError('confirmError', 'As senhas não coincidem');
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'Cadastrando...';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, phone, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      successMessage.textContent = 'Cadastro realizado com sucesso! Redirecionando...';
      successMessage.style.display = 'block';

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } catch (error) {
      showError('registerError', error.message);
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Cadastrar';
    }
  });
});
