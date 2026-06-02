const BaseVehicleProvider = require('./BaseVehicleProvider');
const logger = require('../config/logger');

/**
 * CustomProvider
 *
 * Provider de reserva totalmente configurável via variáveis de ambiente.
 * Use para integrar qualquer API veicular brasileira não coberta pelos
 * outros providers.
 *
 * Variáveis de ambiente:
 *   PROVIDER_CUSTOM_URL        = URL base da API
 *   PROVIDER_CUSTOM_KEY        = Chave de API (header X-API-Key)
 *   PROVIDER_CUSTOM_TOKEN      = Token Bearer
 *   PROVIDER_CUSTOM_PATH       = Path do endpoint (padrão: /consulta/{placa})
 *   PROVIDER_CUSTOM_AUTH_TYPE  = Tipo de auth: "bearer" | "apikey" | "basic" | "query"
 *   PROVIDER_CUSTOM_AUTH_PARAM = Nome do parâmetro de query (se auth_type=query)
 *
 * Exemplos de configuração:
 *
 *   # Auth via Bearer token
 *   PROVIDER_CUSTOM_URL=https://api.meuservico.com.br/v2
 *   PROVIDER_CUSTOM_TOKEN=meu_token_aqui
 *   PROVIDER_CUSTOM_PATH=/veiculos/{placa}
 *
 *   # Auth via query param
 *   PROVIDER_CUSTOM_URL=https://api.outro.com.br
 *   PROVIDER_CUSTOM_KEY=minha_chave
 *   PROVIDER_CUSTOM_AUTH_TYPE=query
 *   PROVIDER_CUSTOM_AUTH_PARAM=token
 *   PROVIDER_CUSTOM_PATH=/v1/placa/{placa}
 */
class CustomProvider extends BaseVehicleProvider {
  constructor() {
    const apiUrl    = process.env.PROVIDER_CUSTOM_URL    || '';
    const apiKey    = process.env.PROVIDER_CUSTOM_KEY    || '';
    const apiToken  = process.env.PROVIDER_CUSTOM_TOKEN  || '';
    const authType  = process.env.PROVIDER_CUSTOM_AUTH_TYPE || 'bearer';

    // Monta headers de autenticação conforme o tipo
    const headers = {};
    if (authType === 'bearer' && apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    } else if (authType === 'apikey' && apiKey) {
      headers['X-API-Key'] = apiKey;
    } else if (authType === 'basic' && apiKey) {
      headers['Authorization'] = `Basic ${Buffer.from(apiKey).toString('base64')}`;
    }

    super({
      name: 'CustomProvider',
      baseURL: apiUrl,
      timeout: 15000,
      retries: 1,
      headers,
    });

    this._apiKey    = apiKey;
    this._apiToken  = apiToken;
    this._apiUrl    = apiUrl;
    this._authType  = authType;
    this._authParam = process.env.PROVIDER_CUSTOM_AUTH_PARAM || 'token';
    this._path      = process.env.PROVIDER_CUSTOM_PATH || '/consulta/{placa}';
  }

  isConfigured() {
    const hasUrl   = !!(this._apiUrl && this._apiUrl.length > 10);
    const hasKey   = !!(this._apiKey   && this._apiKey   !== 'sua_chave' && this._apiKey.length > 4);
    const hasToken = !!(this._apiToken && this._apiToken !== 'seu_token' && this._apiToken.length > 4);
    return hasUrl && (hasKey || hasToken);
  }

  /**
   * Consulta o veículo usando o path e autenticação configurados.
   */
  async fetch(placa) {
    const path = this._path.replace('{placa}', placa);

    // Auth via query param (ex: ?token=xxx)
    const params = {};
    if (this._authType === 'query' && this._apiKey) {
      params[this._authParam] = this._apiKey;
    }

    const response = await this.client.get(path, { params });
    return this._normalize(placa, response.data);
  }

  /**
   * Normalização genérica — tenta cobrir os campos mais comuns.
   * Ajuste conforme a estrutura real da sua API.
   */
  _normalize(placa, raw) {
    // Suporte a múltiplos níveis de aninhamento
    const v = raw?.result || raw?.data?.veiculo || raw?.veiculo
           || raw?.vehicle || raw?.data || raw;

    const fipeRaw = v.fipe || v.fipe_data || v.tabela_fipe || null;
    const fipe = fipeRaw ? {
      codigo:        fipeRaw.codigo      || fipeRaw.fipe_code  || null,
      valor:         fipeRaw.valor       || fipeRaw.price      || null,
      referencia:    fipeRaw.referencia  || fipeRaw.reference  || null,
      desvalorizacao: fipeRaw.variacao   || null,
    } : null;

    const ft = v.ficha_tecnica || v.technical || v.specs || null;
    const fichaTecnica = ft ? {
      potencia:         ft.potencia    || ft.power        || null,
      torque:           ft.torque                         || null,
      motorizacao:      ft.motor       || ft.engine       || null,
      cambio:           ft.cambio      || ft.gearbox      || null,
      peso:             ft.peso        || ft.weight       || null,
      capacidadeTanque: ft.tanque      || ft.tank         || null,
      numeroPortas:     ft.portas      || ft.doors        || null,
      consumoUrbano:    ft.consumo_urbano                 || null,
      consumoRodoviario: ft.consumo_estrada               || null,
      aceleracao:       ft.aceleracao  || ft.acceleration || null,
      velocidadeMaxima: ft.vel_max     || ft.top_speed    || null,
      comprimento:      ft.comprimento || ft.length       || null,
      largura:          ft.largura     || ft.width        || null,
      altura:           ft.altura      || ft.height       || null,
      entreEixos:       ft.entre_eixos || ft.wheelbase    || null,
    } : null;

    return this.buildDTO({
      placa:         v.placa         || placa,
      marca:         v.marca         || v.brand        || null,
      modelo:        v.modelo        || v.model        || null,
      anoFabricacao: v.ano_fabricacao || v.ano          || null,
      anoModelo:     v.ano_modelo    || null,
      cor:           v.cor           || v.color        || null,
      municipio:     v.municipio     || v.cidade       || null,
      uf:            v.uf            || v.estado       || null,
      chassi:        v.chassi        || v.chassis      || null,
      renavam:       v.renavam       || null,
      tipo:          v.tipo          || v.type         || null,
      especie:       v.especie       || null,
      categoria:     v.categoria     || null,
      combustivel:   v.combustivel   || v.fuel         || null,
      situacao:      v.situacao      || 'REGULAR',
      rouboFurto:    v.roubo_furto   || v.stolen       || false,
      restricoes:    v.restricoes    || [],
      multas:        v.multas        || [],
      fipe,
      fichaTecnica,
      fotos:         v.fotos         || v.images       || [],
    });
  }
}

module.exports = new CustomProvider();
