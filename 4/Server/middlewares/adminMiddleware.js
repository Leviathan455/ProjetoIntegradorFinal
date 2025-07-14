const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    
    // Verifica se o usuário é admin
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token inválido' });
  }
};