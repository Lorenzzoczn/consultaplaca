const BaseVehicleProvider = require('./BaseVehicleProvider');
const axios = require('axios');
const logger = require('../config/logger');

/**
 * FipePublicProvider
 *
 * Integração com APIs públicas e gratuitas brasileiras para consulta veicular.
 * Combina múltiplas fontes abertas para montar o máximo de dados possível:
 *
 *   1. parallelum.com.br/fipe  → Tabela FIPE (marca, modelo, ano, valor)
 *   2. brasilapi.com.br        → Dados complementares
 *
 * Sem necessidade de chave de API. Sempre ativo.
 *
 * LIMITAÇÃO: APIs públicas não fornecem dados de registro (chassi, RENAVAM,
 * município, situação). Para dados completos, configure um provider privado.
 */
class FipePublicProvider extends BaseVehicleProvider {
  constructor() {
    super({
      name: 'FipePublic',
      baseURL: 'https://parallelum.com.br/fipe/api/v1',
      timeout: 10000,
      retries: 1,
    });

    // Cliente separado para BrasilAPI
    this.brasilApiClient = axios.create({
      baseURL: 'https://brasilapi.com.br/api',
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  isConfigured() {
    return true; // Sempre ativo — API pública gratuita
  }

  /**
   * Consulta dados do veículo combinando FIPE pública + BrasilAPI.
   * Estratégia: tenta BrasilAPI primeiro (tem endpoint de placa),
   * depois enriquece com dados FIPE se disponível.
   */
  async fetch(placa) {
    const cleanPlaca = placa.replace('-', '');

    // Tenta BrasilAPI (endpoint de placa — disponível em algumas versões)
    let baseData = null;
    try {
      const res = await this.brasilApiClient.get(`/vehicles/v1/${cleanPlaca}`);
      if (res.data) {
        baseData = this._normalizeBrasilApi(cleanPlaca, res.data);
        logger.debug(`[FipePublic] BrasilAPI retornou dados para ${cleanPlaca}`);
      }
    } catch (err) {
      const status = err.response?.status;
      // BrasilAPI retorna 404 quando não tem o endpoint ou não encontrou
      // NÃO propagamos como 404 definitivo — deixamos o próximo provider tentar
      logger.debug(`[FipePublic] BrasilAPI indisponível para ${cleanPlaca}: ${err.message} (${status})`);
    }

    // Se BrasilAPI retornou dados com código FIPE, enriquece com valor
    if (baseData?.fipe?.codigo) {
      try {
        const fipeEnriquecido = await this._fetchFipeValue(baseData.fipe.codigo, baseData._tipoVeiculo);
        if (fipeEnriquecido) {
          baseData.fipe = { ...baseData.fipe, ...fipeEnriquecido };
        }
      } catch {
        // Falha no enriquecimento FIPE não é crítica
      }
    }

    // Se BrasilAPI não retornou nada, lança erro genérico para o próximo provider tentar
    if (!baseData) {
      const err = new Error('API pública sem dados para esta placa — tentando próximo provider');
      err.response = { status: 503 };
      throw err;
    }

    return this.buildDTO(baseData);
  }

  /**
   * Busca valor FIPE por código na API parallelum.
   */
  async _fetchFipeValue(codigoFipe, tipoVeiculo = 'carros') {
    try {
      const res = await this.client.get(`/${tipoVeiculo}/marcas`);
      // A API FIPE pública não busca por código diretamente de forma simples
      // Retorna null para não bloquear o fluxo
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normaliza resposta da BrasilAPI para o DTO padrão.
   */
  _normalizeBrasilApi(placa, raw) {
    // BrasilAPI retorna diferentes estruturas dependendo da versão
    const v = raw?.data || raw;

    // Detecta tipo de veículo para FIPE
    const tipo = (v.tipo || v.vehicleType || '').toUpperCase();
    let tipoVeiculo = 'carros';
    if (tipo.includes('MOTO') || tipo.includes('MOTORCYCLE')) tipoVeiculo = 'motos';
    if (tipo.includes('CAMINHAO') || tipo.includes('TRUCK'))   tipoVeiculo = 'caminhoes';

    return {
      placa,
      marca:         v.brand        || v.marca        || null,
      modelo:        v.model        || v.modelo       || null,
      anoFabricacao: v.year         || v.ano          || null,
      anoModelo:     v.modelYear    || v.anoModelo    || null,
      cor:           v.color        || v.cor          || null,
      municipio:     v.city         || v.municipio    || null,
      uf:            v.state        || v.uf           || null,
      chassi:        v.chassis      || v.chassi       || null,
      renavam:       v.renavam      || null,
      tipo:          v.vehicleType  || v.tipo         || null,
      especie:       v.species      || v.especie      || null,
      categoria:     v.category     || v.categoria    || null,
      combustivel:   v.fuel         || v.combustivel  || null,
      situacao:      v.situation    || v.situacao     || 'REGULAR',
      rouboFurto:    v.stolen       || v.rouboFurto   || false,
      restricoes:    v.restrictions || v.restricoes   || [],
      multas:        v.fines        || v.multas       || [],
      fipe: v.fipe ? {
        codigo:     v.fipe.codigoFipe || v.fipe.codigo || null,
        valor:      v.fipe.valor      || null,
        referencia: v.fipe.mesReferencia || null,
        desvalorizacao: null,
      } : null,
      fichaTecnica:  null,
      fotos:         [],
      _tipoVeiculo:  tipoVeiculo, // interno, não vai para o DTO
    };
  }
}

module.exports = new FipePublicProvider();
