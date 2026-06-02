const BaseVehicleProvider = require('./BaseVehicleProvider');
const logger = require('../config/logger');

/**
 * BrasilAPIProvider
 *
 * Integração com a BrasilAPI (https://brasilapi.com.br)
 * API pública e gratuita — sem necessidade de chave.
 *
 * Endpoints utilizados:
 *   GET /api/fipe/price/v1/{codigoFipe}  → Valor FIPE
 *   GET /api/vehicles/v1/{placa}         → Dados do veículo (quando disponível)
 *
 * Limitações conhecidas:
 *   - Não retorna dados de registro (chassi, RENAVAM, município)
 *   - Não retorna situação/restrições
 *   - Ideal como provider secundário para enriquecer dados FIPE
 *
 * Documentação: https://brasilapi.com.br/docs
 */
class BrasilAPIProvider extends BaseVehicleProvider {
  constructor() {
    super({
      name: 'BrasilAPI',
      baseURL: 'https://brasilapi.com.br/api',
      timeout: 10000,
      retries: 1,
    });
  }

  isConfigured() {
    return true; // Pública, sem chave necessária
  }

  /**
   * Consulta dados do veículo via BrasilAPI.
   * Tenta endpoint de veículos; se não disponível, retorna dados parciais.
   *
   * @param {string} placa - Placa limpa (ex: "ABC1234")
   * @returns {Promise<VehicleResponseDTO>}
   */
  async fetch(placa) {
    try {
      // Tenta endpoint de veículos (disponível em algumas versões da BrasilAPI)
      const response = await this.client.get(`/vehicles/v1/${placa}`);
      return this._normalize(placa, response.data);
    } catch (err) {
      // BrasilAPI pode não ter endpoint de placa — lança para o orquestrador tentar fallback
      const status = err.response?.status;
      // BrasilAPI 404 pode significar endpoint indisponível, não veículo inexistente
      // Lança erro genérico para o próximo provider tentar
      logger.debug(`[BrasilAPI] Placa ${placa} retornou status ${status}`);
      const genericErr = new Error(`BrasilAPI indisponível (${status})`);
      genericErr.response = { status: 503 };
      throw genericErr;
    }
  }

  /**
   * Consulta valor FIPE por código.
   * Pode ser chamado separadamente para enriquecer dados de outros providers.
   *
   * @param {string} codigoFipe - Ex: "005340-6"
   * @returns {Promise<Object|null>}
   */
  async fetchFipe(codigoFipe) {
    try {
      const response = await this.client.get(`/fipe/price/v1/${codigoFipe}`);
      const data = Array.isArray(response.data) ? response.data[0] : response.data;

      return {
        codigo:        data.codigoFipe || codigoFipe,
        valor:         data.valor      || null,
        referencia:    data.mesReferencia || null,
        desvalorizacao: null, // BrasilAPI não fornece variação
      };
    } catch {
      return null;
    }
  }

  /**
   * Normaliza resposta da BrasilAPI para VehicleResponseDTO.
   */
  _normalize(placa, raw) {
    return this.buildDTO({
      placa,
      marca:         raw.brand        || raw.marca   || null,
      modelo:        raw.model        || raw.modelo  || null,
      anoFabricacao: raw.year         || raw.ano     || null,
      anoModelo:     raw.modelYear    || raw.anoModelo || null,
      cor:           raw.color        || raw.cor     || null,
      municipio:     raw.city         || raw.municipio || null,
      uf:            raw.state        || raw.uf      || null,
      chassi:        raw.chassis      || raw.chassi  || null,
      renavam:       raw.renavam      || null,
      tipo:          raw.vehicleType  || raw.tipo    || null,
      especie:       raw.species      || raw.especie || null,
      categoria:     raw.category     || raw.categoria || null,
      combustivel:   raw.fuel         || raw.combustivel || null,
      situacao:      raw.situation    || raw.situacao || 'REGULAR',
      rouboFurto:    raw.stolen       || raw.rouboFurto || false,
      restricoes:    raw.restrictions || raw.restricoes || [],
      multas:        raw.fines        || raw.multas  || [],
      fipe:          raw.fipe         || null,
      fichaTecnica:  null,
      fotos:         [],
    });
  }
}

module.exports = new BrasilAPIProvider();
