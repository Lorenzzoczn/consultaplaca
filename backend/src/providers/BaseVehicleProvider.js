const axios = require('axios');
const logger = require('../config/logger');
const { createVehicleResponseDTO } = require('../dto/VehicleResponseDTO');

/**
 * BaseVehicleProvider
 *
 * Classe base que todos os providers devem estender.
 * Define o contrato e fornece utilitários comuns:
 *   - cliente HTTP com timeout configurável
 *   - mascaramento de dados sensíveis
 *   - retry automático com backoff exponencial
 *   - normalização para VehicleResponseDTO
 */
class BaseVehicleProvider {
  /**
   * @param {Object} config
   * @param {string}  config.name       - Nome identificador do provider
   * @param {string}  config.baseURL    - URL base da API
   * @param {number}  [config.timeout]  - Timeout em ms (padrão: 12000)
   * @param {number}  [config.retries]  - Tentativas em caso de falha (padrão: 2)
   * @param {Object}  [config.headers]  - Headers HTTP adicionais
   */
  constructor({ name, baseURL, timeout = 12000, retries = 2, headers = {} }) {
    this.name    = name;
    this.timeout = timeout;
    this.retries = retries;

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
    });

    // Log todas as requisições em debug
    this.client.interceptors.request.use((config) => {
      logger.debug(`[${this.name}] → ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
  }

  /**
   * Método principal que deve ser implementado por cada provider.
   * @param {string} placa - Placa limpa (sem hífen, maiúscula)
   * @returns {Promise<VehicleResponseDTO>}
   */
  async fetch(placa) {
    throw new Error(`Provider "${this.name}" não implementou o método fetch()`);
  }

  /**
   * Executa fetch() com retry automático e backoff exponencial.
   * @param {string} placa
   * @returns {Promise<VehicleResponseDTO>}
   */
  async fetchWithRetry(placa) {
    let lastError;

    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      try {
        const startTime = Date.now();
        const data = await this.fetch(placa);
        data.duration = Date.now() - startTime;
        data.provider = this.name;
        return data;
      } catch (err) {
        lastError = err;

        // Não retentar em 404 (veículo não encontrado) ou 401/403 (auth)
        const status = err.response?.status;
        if (status === 404 || status === 401 || status === 403) {
          throw err;
        }

        if (attempt <= this.retries) {
          const delay = Math.pow(2, attempt - 1) * 500; // 500ms, 1000ms, 2000ms...
          logger.warn(`[${this.name}] Tentativa ${attempt} falhou. Retry em ${delay}ms. Erro: ${err.message}`);
          await this._sleep(delay);
        }
      }
    }

    throw lastError;
  }

  // ─── Utilitários de mascaramento ────────────────────────────────────────────

  /**
   * Mascara chassi: mantém 3 primeiros e 3 últimos caracteres.
   * Ex: "9BWZZZ377VT004251" → "9BW***********251"
   */
  maskChassi(chassi) {
    if (!chassi) return null;
    const s = chassi.toString().trim();
    if (s.length <= 6) return s;
    return s.slice(0, 3) + '*'.repeat(s.length - 6) + s.slice(-3);
  }

  /**
   * Mascara RENAVAM: mantém apenas os 4 últimos dígitos.
   * Ex: "01234567890" → "*******7890"
   */
  maskRenavam(renavam) {
    if (!renavam) return null;
    const s = renavam.toString().trim();
    if (s.length <= 4) return s;
    return '*'.repeat(s.length - 4) + s.slice(-4);
  }

  /**
   * Cria DTO com dados mascarados aplicados.
   */
  buildDTO(raw) {
    return createVehicleResponseDTO({
      ...raw,
      chassi:  this.maskChassi(raw.chassi),
      renavam: this.maskRenavam(raw.renavam),
      provider: this.name,
    });
  }

  // ─── Helpers internos ───────────────────────────────────────────────────────

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifica se o provider está configurado (tem chave de API).
   * Providers sem configuração são ignorados automaticamente.
   */
  isConfigured() {
    return true; // Sobrescrever nos providers que exigem chave
  }
}

module.exports = BaseVehicleProvider;
