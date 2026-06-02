const logger = require('../config/logger');

// ─── Providers (ordem de prioridade) ─────────────────────────────────────────
const apiPlacasProvider  = require('../providers/apiPlacasProvider');    // 1º ApiPlacas (principal)
const placaFipeProvider  = require('../providers/placaFipeProvider');    // 2º API privada alternativa
const customProvider     = require('../providers/customProvider');       // 3º API custom
const fipePublicProvider = require('../providers/fipePublicProvider');   // 4º APIs públicas gratuitas
const brasilApiProvider  = require('../providers/brasilApiProvider');    // 5º BrasilAPI fallback
const mockProvider       = require('../providers/mockProvider');         // 6º Mock (dev/demo)

/**
 * VehicleService — Orquestrador central de consulta veicular.
 *
 * Fluxo:
 *   1. Valida e formata a placa
 *   2. Filtra providers ativos (isConfigured() === true)
 *   3. Tenta cada provider em ordem de prioridade
 *   4. Fallback automático em caso de erro (exceto 404)
 *   5. Retorna VehicleResponseDTO padronizado
 *
 * Para adicionar um novo provider:
 *   1. Crie src/providers/meuProvider.js estendendo BaseVehicleProvider
 *   2. Importe aqui e adicione ao array _allProviders
 */
class VehicleService {
  constructor() {
    this._allProviders = [
      apiPlacasProvider,   // ApiPlacas — principal (dados completos)
      placaFipeProvider,   // API privada alternativa
      customProvider,      // API custom configurável
      fipePublicProvider,  // APIs públicas gratuitas
      brasilApiProvider,   // BrasilAPI fallback
      mockProvider,        // Mock — dev/demo (NODE_ENV=development)
    ];
  }

  // ─── Validação ────────────────────────────────────────────────────────────

  validatePlate(placa) {
    const clean = placa.replace(/[-\s]/g, '').toUpperCase();
    return /^[A-Z]{3}[0-9]{4}$/.test(clean) ||       // ABC-1234
           /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean); // ABC1D23 Mercosul
  }

  formatPlate(placa) {
    const clean = placa.replace(/[-\s]/g, '').toUpperCase();
    return clean.length === 7 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
  }

  cleanPlate(placa) {
    return placa.replace(/[-\s]/g, '').toUpperCase();
  }

  // ─── Consulta principal ───────────────────────────────────────────────────

  async consultarVeiculo(placa) {
    const startTime  = Date.now();
    const cleanPlaca = this.cleanPlate(placa);

    const activeProviders = this._allProviders.filter((p) => {
      const configured = p.isConfigured();
      logger.debug(`[VehicleService] Provider ${p.name}: ${configured ? 'ATIVO' : 'inativo'}`);
      return configured;
    });

    if (activeProviders.length === 0) {
      throw new Error('Nenhum provider de consulta veicular está configurado.');
    }

    logger.info(`[VehicleService] Placa ${cleanPlaca} | Providers ativos: ${activeProviders.map(p => p.name).join(' → ')}`);

    const errors = [];

    for (const provider of activeProviders) {
      try {
        logger.debug(`[VehicleService] Tentando: ${provider.name}`);
        const data = await provider.fetchWithRetry(cleanPlaca);
        const duration = Date.now() - startTime;

        logger.info(`[VehicleService] ✓ ${provider.name} | ${data.duration}ms | total: ${duration}ms`);
        return { success: true, data, duration };

      } catch (err) {
        const status = err.response?.status;

        // 404 definitivo — veículo não existe, não tenta outros providers
        if (status === 404) {
          logger.info(`[VehicleService] 404 em ${provider.name} para ${cleanPlaca}`);
          return { success: false, notFound: true, duration: Date.now() - startTime };
        }

        // Erro recuperável — tenta próximo provider
        logger.warn(`[VehicleService] ✗ ${provider.name}: ${err.message} (${status || 'sem status'})`);
        errors.push({ provider: provider.name, error: err.message, status });
      }
    }

    // Todos falharam com erros não-404
    logger.error(`[VehicleService] Todos os providers falharam para ${cleanPlaca}`, { errors });
    const err = new Error('Serviço temporariamente indisponível. Tente novamente em instantes.');
    err.statusCode = 503;
    err.providerErrors = errors;
    throw err;
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  getProvidersStatus() {
    return this._allProviders.map((p) => ({
      name:       p.name,
      configured: p.isConfigured(),
      timeout:    p.timeout,
      retries:    p.retries,
    }));
  }
}

module.exports = new VehicleService();
