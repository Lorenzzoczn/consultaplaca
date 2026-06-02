const prisma = require('../config/database');
const vehicleService = require('../services/vehicleService');
const logger = require('../config/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Persiste log da consulta no banco e incrementa contador do usuário.
 * Falhas aqui não interrompem a resposta ao usuário.
 */
async function _logConsulta(userId, placa, status, resultado, duration, req) {
  try {
    await Promise.all([
      prisma.consulta.create({
        data: {
          userId,
          placa,
          status,
          resultado: resultado ?? undefined,
          duration,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      }),
      status === 'SUCCESS'
        ? prisma.user.update({
            where: { id: userId },
            data: { consultasUsed: { increment: 1 } },
          })
        : Promise.resolve(),
    ]);
  } catch (logErr) {
    logger.error('Falha ao persistir log de consulta:', logErr.message);
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/consulta
 * Consulta veículo via APIs externas (corpo: { placa })
 */
const consultar = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { placa } = req.body;

    if (!placa) {
      return res.status(400).json({ success: false, message: 'Placa é obrigatória' });
    }

    if (!vehicleService.validatePlate(placa)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de placa inválido. Use ABC-1234 (antigo) ou ABC1D23 (Mercosul)',
      });
    }

    const formattedPlaca = vehicleService.formatPlate(placa);
    const result = await vehicleService.consultarVeiculo(formattedPlaca);
    const duration = Date.now() - startTime;

    if (result.notFound) {
      await _logConsulta(req.user.id, formattedPlaca, 'NOT_FOUND', null, duration, req);
      return res.status(404).json({
        success: false,
        message: 'Veículo não encontrado para esta placa',
      });
    }

    await _logConsulta(req.user.id, formattedPlaca, 'SUCCESS', result.data, duration, req);

    logger.info(`Consulta OK: ${formattedPlaca} | user: ${req.user.email} | provider: ${result.data.provider} | ${duration}ms`);

    return res.json({
      success: true,
      data: result.data,
      meta: {
        duration,
        provider: result.data.provider,
        consultasUsed:  req.user.consultasUsed + 1,
        consultasLimit: req.user.consultasLimit,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    await _logConsulta(req.user.id, req.body.placa?.toUpperCase() || 'UNKNOWN', 'ERROR', null, duration, req);
    next(error);
  }
};

/**
 * GET /api/vehicle/:placa
 * Endpoint alternativo RESTful para consulta via path param.
 * Mesmo comportamento do POST /api/consulta.
 */
const consultarGet = async (req, res, next) => {
  // Reutiliza a mesma lógica injetando placa no body
  req.body = { placa: req.params.placa };
  return consultar(req, res, next);
};

/**
 * GET /api/consulta/historico
 * Histórico de consultas do usuário (ou todos, se admin)
 */
const historico = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, placa, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      // Admin vê todos; usuário comum vê apenas os seus
      ...(req.user.role !== 'ADMIN' && { userId: req.user.id }),
      ...(placa  && { placa:  { contains: placa.toUpperCase() } }),
      ...(status && { status: status.toUpperCase() }),
    };

    const [consultas, total] = await Promise.all([
      prisma.consulta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.consulta.count({ where }),
    ]);

    return res.json({
      success: true,
      data: consultas,
      pagination: {
        page:  parseInt(page),
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
 * GET /api/consulta/recentes
 * Últimas 5 consultas bem-sucedidas do usuário logado
 */
const recentes = async (req, res, next) => {
  try {
    const consultas = await prisma.consulta.findMany({
      where: { userId: req.user.id, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id:        true,
        placa:     true,
        createdAt: true,
        resultado: true,
      },
    });

    return res.json({ success: true, data: consultas });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/consulta/providers
 * Status dos providers configurados (apenas admin)
 */
const providersStatus = async (req, res) => {
  const status = vehicleService.getProvidersStatus();
  return res.json({ success: true, data: status });
};

module.exports = { consultar, consultarGet, historico, recentes, providersStatus };
