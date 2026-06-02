const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Faça login novamente.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Sessão inválida ou expirada',
        code: 'SESSION_EXPIRED',
      });
    }

    if (!session.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Conta desativada. Entre em contato com o suporte.',
      });
    }

    req.user = session.user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Erro interno de autenticação' });
  }
};

/**
 * Middleware to require admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Permissão de administrador necessária.',
    });
  }
  next();
};

/**
 * Middleware to check consulta limits
 */
const checkConsultaLimit = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'ADMIN') return next(); // Admins have no limit

    if (user.consultasUsed >= user.consultasLimit) {
      return res.status(429).json({
        success: false,
        message: 'Limite de consultas atingido. Contate o administrador.',
        code: 'QUOTA_EXCEEDED',
        data: {
          used: user.consultasUsed,
          limit: user.consultasLimit,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Check limit middleware error:', error);
    next(error);
  }
};

module.exports = { authenticate, requireAdmin, checkConsultaLimit };
