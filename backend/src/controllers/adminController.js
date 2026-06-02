const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /admin/stats
 * Dashboard statistics
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalConsultas,
      consultasHoje,
      consultasSemana,
      topUsers,
      recentConsultas,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.consulta.count(),
      prisma.consulta.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.consulta.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.user.findMany({
        orderBy: { consultasUsed: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          consultasUsed: true,
          consultasLimit: true,
        },
      }),
      prisma.consulta.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Consultas by day (last 7 days)
    const consultasPorDia = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM consultas
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      success: true,
      data: {
        usuarios: { total: totalUsers, ativos: activeUsers },
        consultas: {
          total: totalConsultas,
          hoje: consultasHoje,
          semana: consultasSemana,
          porDia: consultasPorDia,
        },
        topUsers,
        recentConsultas,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          consultasLimit: true,
          consultasUsed: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /admin/users
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, consultasLimit } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'USER',
        consultasLimit: consultasLimit || 100,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        consultasLimit: true,
        consultasUsed: true,
        createdAt: true,
      },
    });

    logger.info(`Admin ${req.user.email} created user: ${user.email}`);

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /admin/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, consultasLimit, password } = req.body;

    const updateData = {
      ...(name && { name }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(consultasLimit !== undefined && { consultasLimit: parseInt(consultasLimit) }),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        consultasLimit: true,
        consultasUsed: true,
      },
    });

    logger.info(`Admin ${req.user.email} updated user: ${user.email}`);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Não é possível excluir sua própria conta' });
    }

    await prisma.user.delete({ where: { id } });

    logger.info(`Admin ${req.user.email} deleted user: ${id}`);

    res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /admin/users/:id/reset-consultas
 */
const resetConsultas = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { consultasUsed: 0 },
    });

    res.json({ success: true, message: 'Contador de consultas resetado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getUsers, createUser, updateUser, deleteUser, resetConsultas };
