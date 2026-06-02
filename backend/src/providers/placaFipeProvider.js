const BaseVehicleProvider = require('./BaseVehicleProvider');
const logger = require('../config/logger');

/**
 * PlacaFipeProvider
 *
 * Integração com APIs privadas de consulta veicular brasileira.
 * Configurado via variáveis de ambiente:
 *
 *   PROVIDER_PLACAFIPE_URL   = URL base da API (ex: https://api.placafipe.com.br/v1)
 *   PROVIDER_PLACAFIPE_KEY   = Chave de autenticação
 *   PROVIDER_PLACAFIPE_TOKEN = Token Bearer (se necessário)
 *
 * Compatível com provedores como:
 *   - PlacaFipe (https://placafipe.com.br)
 *   - ApiPlacas (https://apiplacas.com.br)
 *   - ConsultaPlacas (https://consultaplacas.com.br)
 *   - Detran APIs privadas
 *
 * Para adaptar a outro provedor, ajuste apenas _normalize() e os
 * headers de autenticação no construtor.
 */
class PlacaFipeProvider extends BaseVehicleProvider {
  constructor() {
    const apiUrl = process.env.PROVIDER_PLACAFIPE_URL || '';
    const apiKey = process.env.PROVIDER_PLACAFIPE_KEY || '';
    const apiToken = process.env.PROVIDER_PLACAFIPE_TOKEN || '';

    super({
      name: 'PlacaFipe',
      baseURL: apiUrl,
      timeout: 15000,
      retries: 2,
      headers: {
        ...(apiKey   && { 'X-API-Key': apiKey }),
        ...(apiToken && { 'Authorization': `Bearer ${apiToken}` }),
      },
    });

    this._apiKey   = apiKey;
    this._apiToken = apiToken;
    this._apiUrl   = apiUrl;
  }

  isConfigured() {
    // Só considera configurado se tiver URL real E chave que não seja placeholder
    const hasUrl = !!(this._apiUrl && !this._apiUrl.includes('placafipe.com.br'));
    const hasKey = !!(this._apiKey && this._apiKey !== 'sua_chave_aqui' && this._apiKey.length > 8);
    const hasToken = !!(this._apiToken && this._apiToken !== 'seu_token_aqui' && this._apiToken.length > 8);
    return hasUrl && (hasKey || hasToken);
  }

  /**
   * Consulta dados completos do veículo.
   * Adapte o path do endpoint conforme seu provedor.
   *
   * @param {string} placa - Placa limpa (ex: "ABC1234")
   * @returns {Promise<VehicleResponseDTO>}
   */
  async fetch(placa) {
    // Adapte o path conforme a documentação do seu provedor:
    // Exemplos comuns:
    //   /veiculo/{placa}
    //   /consulta/placa/{placa}
    //   /v1/plate/{placa}
    const response = await this.client.get(`/veiculo/${placa}`);
    return this._normalize(placa, response.data);
  }

  /**
   * Normaliza resposta para VehicleResponseDTO.
   *
   * Mapeamento genérico que cobre os campos mais comuns
   * retornados por APIs brasileiras de consulta veicular.
   * Ajuste os campos conforme a resposta real do seu provedor.
   */
  _normalize(placa, raw) {
    // Suporte a respostas aninhadas (ex: { data: { veiculo: {...} } })
    const v = raw?.data?.veiculo || raw?.veiculo || raw?.data || raw;

    // Extrai FIPE de diferentes estruturas
    const fipeRaw = v.fipe || v.tabela_fipe || v.valorFipe || null;
    const fipe = fipeRaw ? {
      codigo:        fipeRaw.codigo      || fipeRaw.codigoFipe || null,
      valor:         fipeRaw.valor       || fipeRaw.preco      || null,
      referencia:    fipeRaw.referencia  || fipeRaw.mes        || null,
      desvalorizacao: fipeRaw.variacao   || fipeRaw.desvalorizacao || null,
    } : null;

    // Extrai ficha técnica
    const ft = v.ficha_tecnica || v.fichaTecnica || v.specs || null;
    const fichaTecnica = ft ? {
      potencia:         ft.potencia         || ft.power         || null,
      torque:           ft.torque                               || null,
      motorizacao:      ft.motorizacao      || ft.motor         || ft.engine || null,
      cambio:           ft.cambio           || ft.transmission  || null,
      peso:             ft.peso             || ft.weight        || null,
      capacidadeTanque: ft.capacidade_tanque || ft.tank         || null,
      numeroPortas:     ft.numero_portas    || ft.doors         || null,
      consumoUrbano:    ft.consumo_urbano   || ft.fuel_city     || null,
      consumoRodoviario: ft.consumo_rodoviario || ft.fuel_highway || null,
      aceleracao:       ft.aceleracao       || ft.acceleration  || null,
      velocidadeMaxima: ft.velocidade_maxima || ft.top_speed    || null,
      comprimento:      ft.comprimento      || ft.length        || null,
      largura:          ft.largura          || ft.width         || null,
      altura:           ft.altura           || ft.height        || null,
      entreEixos:       ft.entre_eixos      || ft.wheelbase     || null,
    } : null;

    // Normaliza restrições (pode vir como array de strings ou objetos)
    const restricoes = (v.restricoes || v.restrictions || []).map((r) =>
      typeof r === 'string' ? r : r.descricao || r.description || JSON.stringify(r)
    );

    // Normaliza multas
    const multas = (v.multas || v.fines || []).map((m) =>
      typeof m === 'string' ? m : m.descricao || m.description || JSON.stringify(m)
    );

    // Fotos ilustrativas
    const fotos = v.fotos || v.images || v.photos || [];

    return this.buildDTO({
      placa:         v.placa         || v.plate        || placa,
      marca:         v.marca         || v.brand        || null,
      modelo:        v.modelo        || v.model        || null,
      anoFabricacao: v.ano_fabricacao || v.anoFabricacao || v.year_manufacture || null,
      anoModelo:     v.ano_modelo    || v.anoModelo    || v.year_model        || null,
      cor:           v.cor           || v.color        || null,
      municipio:     v.municipio     || v.cidade       || v.city              || null,
      uf:            v.uf            || v.estado       || v.state             || null,
      chassi:        v.chassi        || v.chassis      || null,
      renavam:       v.renavam                         || null,
      tipo:          v.tipo          || v.type         || null,
      especie:       v.especie       || v.species      || null,
      categoria:     v.categoria     || v.category     || null,
      combustivel:   v.combustivel   || v.fuel         || null,
      situacao:      v.situacao      || v.situation    || 'REGULAR',
      rouboFurto:    v.roubo_furto   || v.rouboFurto   || v.stolen || false,
      restricoes,
      multas,
      fipe,
      fichaTecnica,
      fotos: Array.isArray(fotos) ? fotos : [],
    });
  }
}

module.exports = new PlacaFipeProvider();
