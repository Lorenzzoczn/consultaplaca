const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Generate JWT token and create session
 */
const generateTokens = async (user, req) => {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  return token;
};

/**
 * POST /auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Conta desativada. Entre em contato com o suporte.',
      });
    }

    const token = await generateTokens(user, req);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    logger.info(`User ${user.email} logged in from ${req.ip}`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          consultasLimit: user.consultasLimit,
          consultasUsed: user.consultasUsed,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/register (admin only or open registration)
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Este email já está cadastrado',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'USER',
      },
    });

    const token = await generateTokens(user, req);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          consultasLimit: user.consultasLimit,
          consultasUsed: user.consultasUsed,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await prisma.session.deleteMany({
      where: { token: req.token },
    });

    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/me
 */
const me = async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      consultasLimit: user.consultasLimit,
      consultasUsed: user.consultasUsed,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
  });
};

/**
 * POST /auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'Se este email estiver cadastrado, você receberá as instruções em breve.',
      });
    }

    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    // TODO: Send email with reset link
    // await emailService.sendPasswordReset(user.email, resetToken);

    logger.info(`Password reset requested for: ${user.email}`);

    res.json({
      success: true,
      message: 'Se este email estiver cadastrado, você receberá as instruções em breve.',
      // In development, return token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });

    res.json({ success: true, message: 'Senha alterada com sucesso. Faça login novamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, logout, me, forgotPassword, resetPassword };
