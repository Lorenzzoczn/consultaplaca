const express = require('express');
const router = express.Router();

const {
  consultar,
  consultarGet,
  historico,
  recentes,
  providersStatus,
} = require('../controllers/consultaController');

const { authenticate, checkConsultaLimit, requireAdmin } = require('../middleware/auth');
const { consultaLimiter } = require('../middleware/rateLimiter');

// ─── Consulta veicular ────────────────────────────────────────────────────────

/**
 * POST /api/consulta
 * Body: { placa: "ABC1234" }
 * Consulta via APIs externas em tempo real
 */
router.post(
  '/',
  authenticate,
  checkConsultaLimit,
  consultaLimiter,
  consultar
);

/**
 * GET /api/vehicle/:placa
 * Endpoint RESTful alternativo
 * Ex: GET /api/vehicle/ABC1234
 */
router.get(
  '/placa/:placa',
  authenticate,
  checkConsultaLimit,
  consultaLimiter,
  consultarGet
);

// ─── Histórico e recentes ─────────────────────────────────────────────────────

router.get('/historico', authenticate, historico);
router.get('/recentes',  authenticate, recentes);

// ─── Status dos providers (admin only) ───────────────────────────────────────

router.get('/providers', authenticate, requireAdmin, providersStatus);

module.exports = router;
