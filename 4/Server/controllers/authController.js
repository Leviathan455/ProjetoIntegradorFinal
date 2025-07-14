const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = {
  async register(req, res) {
    try {
      const { username, email, phone, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      const existingUser = await User.findByEmail(email) || await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          error: existingUser.email === email ? 'Email já cadastrado' : 'Nome de usuário já existe'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const isFirstUser = await User.count() === 0;
      const newUser = await User.create(username, email, phone, passwordHash, isFirstUser);

      const token = jwt.sign(
        {
          id: newUser.id,
          username: newUser.username,
          isAdmin: isFirstUser
        },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '1h' }
      );

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          isAdmin: isFirstUser
        }
      });
    } catch (error) {
      console.error('[ERRO REGISTRO]', error);
      res.status(500).json({ error: 'Erro no servidor ao registrar' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin || false
        },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          isAdmin: user.is_admin || false
        }
      });
    } catch (error) {
      console.error('[ERRO LOGIN]', error);
      res.status(500).json({ error: 'Erro no servidor ao logar' });
    }
  }
};
