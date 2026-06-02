const BaseVehicleProvider = require('./BaseVehicleProvider');
const logger = require('../config/logger');

/**
 * CarQueryProvider
 *
 * Integração com a CarQuery API (https://www.carqueryapi.com)
 * API pública e gratuita — sem necessidade de chave.
 *
 * Documentação: http://www.carqueryapi.com/documentation/api-usage/
 *
 * IMPORTANTE: A CarQuery NÃO aceita placa como entrada.
 * Ela é usada como serviço de ENRIQUECIMENTO de ficha técnica.
 * O fluxo correto é:
 *   1. ApiPlacas retorna marca + modelo + ano
 *   2. CarQuery busca specs técnicas por marca + modelo + ano
 *   3. VehicleService mescla os dados no DTO final
 *
 * Endpoints utilizados:
 *   GET /api/0.3/?cmd=getTrims&make={make}&model={model}&year={year}
 *
 * Campos retornados (principais):
 *   model_engine_power_ps     → Potência (PS)
 *   model_engine_torque_nm    → Torque (Nm)
 *   model_engine_cc           → Cilindradas (cc)
 *   model_engine_cyl          → Cilindros
 *   model_engine_type         → Tipo do motor
 *   model_engine_fuel         → Combustível
 *   model_top_speed_kph       → Velocidade máxima
 *   model_0_to_100_kph        → 0-100 km/h (s)
 *   model_drive               → Tração (AWD, FWD, RWD)
 *   model_transmission_type   → Câmbio
 *   model_seats               → Assentos
 *   model_doors               → Portas
 *   model_weight_kg           → Peso (kg)
 *   model_length_mm           → Comprimento (mm)
 *   model_width_mm            → Largura (mm)
 *   model_height_mm           → Altura (mm)
 *   model_wheelbase_mm        → Entre-eixos (mm)
 *   model_fuel_cap_l          → Capacidade do tanque (L)
 *   model_co2                 → Emissão CO2 (g/km)
 *   model_fuel_l_100km        → Consumo médio (L/100km)
 *   model_body                → Carroceria (Sedan, Hatchback, SUV...)
 */
class CarQueryProvider extends BaseVehicleProvider {
  constructor() {
    super({
      name: 'CarQuery',
      baseURL: 'https://www.carqueryapi.com/api/0.3',
      timeout: 10000,
      retries: 1,
      headers: {
        'Accept': 'application/json, text/javascript, */*',
        'Referer': 'https://www.carqueryapi.com/',
      },
    });
  }

  isConfigured() {
    return true; // API pública gratuita, sempre disponível
  }

  /**
   * Busca especificações técnicas por marca, modelo e ano.
   * Retorna FichaTecnicaDTO enriquecida ou null se não encontrar.
   *
   * @param {string} make  - Marca (ex: "VOLKSWAGEN", "VW", "FIAT")
   * @param {string} model - Modelo (ex: "POLO HIGHLINE", "UNO VIVACE")
   * @param {number|string} year - Ano do modelo (ex: 2022)
   * @returns {Promise<Object|null>}
   */
  async fetchSpecs(make, model, year) {
    if (!make || !model) return null;

    try {
      const makeNorm  = this._normalizeMake(make);
      const modelNorm = this._normalizeModel(model);
      const yearStr   = year ? String(year) : undefined;

      logger.debug(`[CarQuery] Buscando: make="${makeNorm}" model="${modelNorm}" year="${yearStr}"`);

      // Busca trims disponíveis
      const trims = await this._getTrims(makeNorm, modelNorm, yearStr);

      // Se não achou no ano exato, tenta sem filtro de ano
      let finalTrims = trims;
      if ((!trims || trims.length === 0) && yearStr) {
        logger.debug(`[CarQuery] Sem resultado para o ano ${yearStr}, tentando sem filtro de ano`);
        finalTrims = await this._getTrims(makeNorm, modelNorm, undefined);
      }

      if (!finalTrims || finalTrims.length === 0) {
        logger.debug(`[CarQuery] Nenhum dado encontrado para ${makeNorm}/${modelNorm}`);
        return null;
      }

      // Seleciona o trim mais próximo do ano desejado
      const bestTrim = this._selectBestTrim(finalTrims, year);
      logger.debug(`[CarQuery] Selecionado: ${bestTrim.model_name} ${bestTrim.model_trim} (${bestTrim.model_year})`);

      return this._buildFichaTecnica(bestTrim);

    } catch (err) {
      logger.warn(`[CarQuery] Falha para ${make}/${model}: ${err.message}`);
      return null; // Falha silenciosa — não impede o resultado principal
    }
  }

  // ─── Privados ──────────────────────────────────────────────────────────────

  async _getTrims(make, model, year) {
    const params = { cmd: 'getTrims', make, model };
    if (year) params.year = year;

    const qs = new URLSearchParams(params).toString();
    const response = await this.client.get(`/?${qs}`);

    const data  = response.data;
    const trims = data?.Trims || data?.trims || [];
    return Array.isArray(trims) ? trims : [];
  }

  _selectBestTrim(trims, targetYear) {
    if (!targetYear) return trims[0];

    const target = parseInt(targetYear);
    // Ordena por proximidade de ano
    return trims.sort((a, b) => {
      const diffA = Math.abs(parseInt(a.model_year) - target);
      const diffB = Math.abs(parseInt(b.model_year) - target);
      return diffA - diffB;
    })[0];
  }

  _buildFichaTecnica(trim) {
    if (!trim) return null;

    // Potência: PS → CV (aproximadamente iguais para exibição)
    const potenciaPS = parseFloat(trim.model_engine_power_ps);
    const potencia   = potenciaPS > 0 ? `${Math.round(potenciaPS)} cv` : null;

    // Torque: Nm + conversão para kgfm
    const torqueNm = parseFloat(trim.model_engine_torque_nm);
    const torque   = torqueNm > 0
      ? `${torqueNm} Nm (${(torqueNm * 0.102).toFixed(1)} kgfm)`
      : null;

    // Consumo: L/100km → km/L
    const consumoL100 = parseFloat(trim.model_fuel_l_100km);
    const consumoMedio = consumoL100 > 0
      ? `${(100 / consumoL100).toFixed(1)} km/l`
      : null;

    const velMax     = parseFloat(trim.model_top_speed_kph);
    const aceleracao = parseFloat(trim.model_0_to_100_kph);
    const cc         = parseInt(trim.model_engine_cc);
    const comprimento = parseInt(trim.model_length_mm);
    const largura    = parseInt(trim.model_width_mm);
    const altura     = parseInt(trim.model_height_mm);
    const entreEixos = parseInt(trim.model_wheelbase_mm);
    const peso       = parseInt(trim.model_weight_kg);
    const tanque     = parseFloat(trim.model_fuel_cap_l);

    const fichaTecnica = {
      // Motorização
      potencia,
      torque,
      motorizacao:       this._buildMotorizacao(trim, cc),
      cambio:            this._formatCambio(trim.model_transmission_type),
      combustivel:       this._formatCombustivel(trim.model_engine_fuel),
      cilindradas:       cc > 0 ? `${cc} cc` : null,
      cilindros:         parseInt(trim.model_engine_cyl) > 0 ? parseInt(trim.model_engine_cyl) : null,
      tracao:            trim.model_drive || null,

      // Desempenho
      aceleracao:        aceleracao > 0 ? `${aceleracao}s (0-100 km/h)` : null,
      velocidadeMaxima:  velMax > 0 ? `${velMax} km/h` : null,

      // Consumo
      consumoMedio,
      consumoUrbano:     null,
      consumoRodoviario: null,
      emissaoCO2:        parseFloat(trim.model_co2) > 0 ? `${trim.model_co2} g/km` : null,

      // Dimensões
      peso:              peso > 0 ? `${peso} kg` : null,
      capacidadeTanque:  tanque > 0 ? `${tanque} litros` : null,
      numeroPortas:      parseInt(trim.model_doors) > 0 ? parseInt(trim.model_doors) : null,
      numeroAssentos:    parseInt(trim.model_seats) > 0 ? parseInt(trim.model_seats) : null,
      comprimento:       comprimento > 0 ? `${comprimento} mm` : null,
      largura:           largura > 0    ? `${largura} mm`    : null,
      altura:            altura > 0     ? `${altura} mm`     : null,
      entreEixos:        entreEixos > 0 ? `${entreEixos} mm` : null,

      // Extras
      carroceria:        trim.model_body  || null,
      versao:            trim.model_trim  || null,
      anoModelo:         trim.model_year  || null,
      fonte:             'CarQuery API',
    };

    const temDados = Object.entries(fichaTecnica)
      .filter(([k]) => !['fonte', 'versao', 'anoModelo'].includes(k))
      .some(([, v]) => v !== null);

    return temDados ? fichaTecnica : null;
  }

  // ─── Formatadores ──────────────────────────────────────────────────────────

  _normalizeMake(make) {
    const map = {
      'vw':             'volkswagen',
      'vw/':            'volkswagen',
      'gm':             'chevrolet',
      'mercedes':       'mercedes-benz',
      'mercedes benz':  'mercedes-benz',
      'land rover':     'land-rover',
      'landrover':      'land-rover',
      'citroën':        'citroen',
    };
    const normalized = make.toLowerCase().trim().split('/')[0].trim();
    return map[normalized] || normalized;
  }

  _normalizeModel(model) {
    if (!model) return '';
    // "POLO HIGHLINE 200 TSI" → "polo"
    // "COMPASS LIMITED" → "compass"
    return model.toLowerCase().trim().split(/[\s\/]/)[0];
  }

  _buildMotorizacao(trim, cc) {
    const parts = [];
    if (cc > 0) parts.push(`${(cc / 1000).toFixed(1)}`);
    const type = (trim.model_engine_type || '').toUpperCase();
    if (type) parts.push(type);
    const ps = parseFloat(trim.model_engine_power_ps);
    if (ps > 0) parts.push(`${Math.round(ps)}cv`);
    return parts.length > 0 ? parts.join(' ') : null;
  }

  _formatCambio(t) {
    if (!t) return null;
    const map = {
      'automatic': 'Automático',
      'manual':    'Manual',
      'cvt':       'CVT',
      'dct':       'DCT (Dupla Embreagem)',
      'semi-auto': 'Semi-automático',
      'automated': 'Automatizado',
    };
    return map[t.toLowerCase()] || t;
  }

  _formatCombustivel(f) {
    if (!f) return null;
    const map = {
      'petrol':         'Gasolina',
      'gasoline':       'Gasolina',
      'diesel':         'Diesel',
      'electric':       'Elétrico',
      'hybrid':         'Híbrido',
      'plug-in hybrid': 'Híbrido Plug-in',
      'flex':           'Flex',
      'ethanol':        'Etanol',
      'lpg':            'GLP',
      'cng':            'GNV',
    };
    return map[f.toLowerCase()] || f;
  }
}

module.exports = new CarQueryProvider();
