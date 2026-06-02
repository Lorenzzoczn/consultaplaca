/**
 * VehicleResponseDTO
 *
 * Contrato de dados padronizado retornado por todos os providers.
 * Independente de qual API externa for consultada, a resposta
 * sempre seguirá esta estrutura antes de chegar ao frontend.
 */

/**
 * @typedef {Object} FipeDTO
 * @property {string|null} codigo       - Código FIPE (ex: "005340-6")
 * @property {string|null} valor        - Valor formatado (ex: "R$ 89.500,00")
 * @property {string|null} referencia   - Mês/ano de referência
 * @property {string|null} desvalorizacao - Variação percentual
 */

/**
 * @typedef {Object} FichaTecnicaDTO
 * @property {string|null} potencia
 * @property {string|null} torque
 * @property {string|null} motorizacao
 * @property {string|null} cambio
 * @property {string|null} combustivel
 * @property {string|null} cilindradas
 * @property {number|null} cilindros
 * @property {string|null} tracao
 * @property {string|null} peso
 * @property {string|null} capacidadeTanque
 * @property {number|null} numeroPortas
 * @property {number|null} numeroAssentos
 * @property {string|null} consumoMedio
 * @property {string|null} consumoUrbano
 * @property {string|null} consumoRodoviario
 * @property {string|null} emissaoCO2
 * @property {string|null} aceleracao
 * @property {string|null} velocidadeMaxima
 * @property {string|null} comprimento
 * @property {string|null} largura
 * @property {string|null} altura
 * @property {string|null} entreEixos
 * @property {string|null} carroceria
 * @property {string|null} versao
 * @property {string|null} fonte
 */

/**
 * @typedef {Object} VehicleResponseDTO
 * @property {string}            placa
 * @property {string|null}       marca
 * @property {string|null}       modelo
 * @property {number|null}       anoFabricacao
 * @property {number|null}       anoModelo
 * @property {string|null}       cor
 * @property {string|null}       municipio
 * @property {string|null}       uf
 * @property {string|null}       chassi          - Mascarado (ex: "9BW***...***251")
 * @property {string|null}       renavam         - Mascarado (ex: "*******7890")
 * @property {string|null}       tipo            - Ex: "AUTOMÓVEL"
 * @property {string|null}       especie         - Ex: "PASSAGEIRO"
 * @property {string|null}       categoria       - Ex: "PARTICULAR"
 * @property {string|null}       combustivel     - Ex: "FLEX"
 * @property {string}            situacao        - "REGULAR" | "IRREGULAR" | "ROUBADO" | "FURTADO"
 * @property {boolean}           rouboFurto
 * @property {string[]}          restricoes
 * @property {string[]}          multas
 * @property {FipeDTO|null}      fipe
 * @property {FichaTecnicaDTO|null} fichaTecnica
 * @property {string[]}          fotos
 * @property {string}            provider        - Nome do provider que respondeu
 * @property {number}            duration        - Tempo de resposta em ms
 */

/**
 * Cria um VehicleResponseDTO com valores padrão seguros.
 * Garante que campos ausentes nunca causem erros no frontend.
 *
 * @param {Partial<VehicleResponseDTO>} data
 * @returns {VehicleResponseDTO}
 */
function createVehicleResponseDTO(data = {}) {
  return {
    placa:          data.placa          ?? null,
    marca:          data.marca          ?? null,
    modelo:         data.modelo         ?? null,
    anoFabricacao:  data.anoFabricacao  ?? null,
    anoModelo:      data.anoModelo      ?? null,
    cor:            data.cor            ?? null,
    municipio:      data.municipio      ?? null,
    uf:             data.uf             ?? null,
    chassi:         data.chassi         ?? null,
    renavam:        data.renavam        ?? null,
    tipo:           data.tipo           ?? null,
    especie:        data.especie        ?? null,
    categoria:      data.categoria      ?? null,
    combustivel:    data.combustivel    ?? null,
    situacao:       data.situacao       ?? 'REGULAR',
    rouboFurto:     data.rouboFurto     ?? false,
    restricoes:     Array.isArray(data.restricoes) ? data.restricoes : [],
    multas:         Array.isArray(data.multas)     ? data.multas     : [],
    fipe:           data.fipe           ?? null,
    fichaTecnica:   data.fichaTecnica   ?? null,
    fotos:          Array.isArray(data.fotos)      ? data.fotos      : [],
    provider:       data.provider       ?? 'unknown',
    duration:       data.duration       ?? 0,
  };
}

module.exports = { createVehicleResponseDTO };
