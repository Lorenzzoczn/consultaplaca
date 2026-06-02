const BaseVehicleProvider = require('./BaseVehicleProvider');
const logger = require('../config/logger');

/**
 * ApiPlacasProvider
 *
 * Integração com a ApiPlacas (https://apiplacas.com.br)
 * Documentação: https://apiplacas.com.br/doc.php
 *
 * Endpoint:
 *   GET https://wdapi2.com.br/consulta/{placa}/{token}
 *
 * Variável de ambiente necessária:
 *   APIPLACAS_TOKEN=seu_token_aqui
 *
 * Códigos de retorno da API:
 *   200 → Sucesso
 *   400 → URL incorreta
 *   401 → Placa inválida
 *   402 → Token inválido
 *   406 → Sem resultados (veículo não encontrado)
 *   429 → Limite de consultas atingido
 *
 * Campos retornados:
 *   MARCA, MODELO, SUBMODELO, VERSAO, ano, anoModelo, chassi,
 *   codigoSituacao, cor, municipio, uf, placa, situacao, origem,
 *   extra { combustivel, especie, tipo_veiculo, uf, municipio, ... }
 *   fipe { dados: [{ texto_valor, texto_modelo, codigo_fipe, score, ... }] }
 *   logo (URL da logo da marca)
 */
class ApiPlacasProvider extends BaseVehicleProvider {
  constructor() {
    super({
      name: 'ApiPlacas',
      baseURL: 'https://wdapi2.com.br',
      timeout: 15000,
      retries: 2,
    });

    this._token = process.env.APIPLACAS_TOKEN || '';
  }

  isConfigured() {
    return !!(
      this._token &&
      this._token !== 'seu_token_aqui' &&
      this._token.length > 5
    );
  }

  /**
   * Consulta veículo pela placa.
   * URL: GET /consulta/{placa}/{token}
   *
   * @param {string} placa - Placa limpa sem hífen (ex: "ABC1234" ou "ABC1D23")
   */
  async fetch(placa) {
    const cleanPlaca = placa.replace('-', '').toUpperCase();

    let response;
    try {
      response = await this.client.get(`/consulta/${cleanPlaca}/${this._token}`);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.message;

      logger.warn(`[ApiPlacas] Erro HTTP ${status} para placa ${cleanPlaca}: ${msg}`);

      // 406 = sem resultados = veículo não encontrado
      if (status === 406) {
        const notFound = new Error('Veículo não encontrado');
        notFound.response = { status: 404 };
        throw notFound;
      }

      // 401 = placa inválida (formato errado)
      if (status === 401) {
        const invalid = new Error('Formato de placa inválido');
        invalid.response = { status: 400 };
        throw invalid;
      }

      // 402 = token inválido
      if (status === 402) {
        logger.error('[ApiPlacas] Token inválido! Verifique APIPLACAS_TOKEN no .env');
        const authErr = new Error('Token ApiPlacas inválido');
        authErr.response = { status: 401 };
        throw authErr;
      }

      // 429 = limite atingido
      if (status === 429) {
        const limitErr = new Error('Limite de consultas ApiPlacas atingido');
        limitErr.response = { status: 429 };
        throw limitErr;
      }

      throw err;
    }

    const raw = response.data;

    // Verifica se a resposta tem dados válidos
    if (!raw || !raw.MARCA) {
      const notFound = new Error('Veículo não encontrado');
      notFound.response = { status: 404 };
      throw notFound;
    }

    return this._normalize(cleanPlaca, raw);
  }

  /**
   * Normaliza a resposta da ApiPlacas para VehicleResponseDTO.
   *
   * Estrutura real da ApiPlacas:
   * {
   *   MARCA, MODELO, SUBMODELO, VERSAO,
   *   ano, anoModelo, chassi, codigoSituacao, cor,
   *   municipio, uf, placa, situacao, origem,
   *   extra: { combustivel, especie, tipo_veiculo, municipio, uf, ... },
   *   fipe: { dados: [{ texto_valor, texto_modelo, codigo_fipe, score, mes_referencia }] },
   *   logo, marca, marcaModelo, modelo
   * }
   */
  _normalize(placa, raw) {
    const extra = raw.extra || {};

    // ─── Situação ─────────────────────────────────────────────────────────────
    // codigoSituacao: "0" = regular, outros = irregular
    // situacao: texto descritivo ("Sem restrição", "Roubo/Furto", etc.)
    const situacaoTexto = (raw.situacao || '').toLowerCase();
    let situacao = 'REGULAR';
    if (situacaoTexto.includes('roubo') || situacaoTexto.includes('furto')) {
      situacao = 'ROUBADO';
    } else if (situacaoTexto.includes('irregular') || raw.codigoSituacao !== '0') {
      situacao = 'IRREGULAR';
    }

    const rouboFurto = situacao === 'ROUBADO';

    // ─── Restrições ───────────────────────────────────────────────────────────
    const restricoes = [];
    if (raw.situacao && raw.situacao !== 'Sem restrição' && raw.situacao !== 'Sem restricao') {
      restricoes.push(raw.situacao);
    }

    // ─── FIPE ─────────────────────────────────────────────────────────────────
    // ApiPlacas pode retornar múltiplos resultados FIPE — usa o de maior score
    let fipe = null;
    if (raw.fipe?.dados?.length > 0) {
      const melhor = raw.fipe.dados.reduce((best, item) =>
        (item.score || 0) > (best.score || 0) ? item : best
      , raw.fipe.dados[0]);

      fipe = {
        codigo:        melhor.codigo_fipe        || null,
        valor:         melhor.texto_valor        || null,
        referencia:    melhor.mes_referencia     || null,
        desvalorizacao: null, // ApiPlacas não fornece variação
        modelo:        melhor.texto_modelo       || null,
        score:         melhor.score              || null,
      };
    }

    // ─── Ficha técnica (via campo extra) ──────────────────────────────────────
    // O campo extra pode não estar disponível em todas as consultas
    let fichaTecnica = null;
    if (extra && Object.keys(extra).length > 0) {
      fichaTecnica = {
        potencia:          null, // ApiPlacas não fornece
        torque:            null,
        motorizacao:       extra.cilindradas ? `${extra.cilindradas}cc` : null,
        cambio:            extra.caixa_cambio  || null,
        peso:              extra.peso_bruto_total ? `${extra.peso_bruto_total} kg` : null,
        capacidadeTanque:  null,
        numeroPortas:      null,
        consumoUrbano:     null,
        consumoRodoviario: null,
        aceleracao:        null,
        velocidadeMaxima:  null,
        comprimento:       null,
        largura:           null,
        altura:            null,
        entreEixos:        null,
      };

      // Só retorna fichaTecnica se tiver ao menos um campo preenchido
      const temDados = Object.values(fichaTecnica).some(v => v !== null);
      if (!temDados) fichaTecnica = null;
    }

    // ─── Fotos ────────────────────────────────────────────────────────────────
    const fotos = raw.logo ? [raw.logo] : [];

    // ─── Monta DTO ────────────────────────────────────────────────────────────
    return this.buildDTO({
      placa:         raw.placa          || extra.placa_modelo_novo || placa,
      marca:         raw.MARCA          || raw.marca               || null,
      modelo:        raw.MODELO         || raw.modelo              || null,
      anoFabricacao: extra.ano_fabricacao || raw.ano               || null,
      anoModelo:     extra.ano_modelo    || raw.anoModelo          || null,
      cor:           raw.cor                                       || null,
      municipio:     raw.municipio      || extra.municipio         || null,
      uf:            raw.uf             || extra.uf_placa          || null,
      chassi:        raw.chassi                                    || null, // já vem mascarado pela ApiPlacas
      renavam:       null,                                                  // ApiPlacas não fornece RENAVAM
      tipo:          extra.tipo_veiculo                            || null,
      especie:       extra.especie      || extra['s.especie']      || null,
      categoria:     extra.segmento                                || null,
      combustivel:   extra.combustivel  || null,
      situacao,
      rouboFurto,
      restricoes,
      multas:        [],  // ApiPlacas não fornece multas no plano básico
      fipe,
      fichaTecnica,
      fotos,
    });
  }
}

module.exports = new ApiPlacasProvider();
