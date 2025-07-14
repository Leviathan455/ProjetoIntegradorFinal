const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next(); // Nenhuma credencial, continua como convidado
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(); // Formato de token inválido, continua como convidado
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adiciona o usuário à requisição se o token for válido
  } catch (err) {
    // Token inválido ou expirado, mas não bloqueamos a requisição
    console.log('Token inválido para acesso opcional, tratando como convidado.');
  }
  
  next();
};