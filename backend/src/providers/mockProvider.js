const BaseVehicleProvider = require('./BaseVehicleProvider');

/**
 * MockProvider
 *
 * Provider de desenvolvimento e demonstração.
 * Ativado automaticamente quando:
 *   - NODE_ENV=development  E  nenhum provider real está configurado
 *   - ENABLE_MOCK_PROVIDER=true  (forçar mock mesmo em produção para testes)
 *
 * Simula latência de API real (200–800ms) e retorna dados realistas.
 * Placas especiais para testar cenários:
 *
 *   ERRO0001 → Simula erro de API (status 500)
 *   NOTF0001 → Simula veículo não encontrado (status 404)
 *   RSTR0001 → Veículo com restrições e roubo/furto
 *   Qualquer outra → Dados completos de um VW Polo
 */
class MockProvider extends BaseVehicleProvider {
  constructor() {
    super({
      name: 'MockProvider',
      baseURL: 'http://localhost',
      timeout: 5000,
      retries: 0,
    });
  }

  isConfigured() {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.ENABLE_MOCK_PROVIDER === 'true'
    );
  }

  async fetch(placa) {
    // Simula latência de API real
    await this._sleep(200 + Math.random() * 600);

    if (placa === 'ERRO0001') {
      const err = new Error('Erro simulado de API externa');
      err.response = { status: 500 };
      throw err;
    }

    if (placa === 'NOTF0001') {
      const err = new Error('Veículo não encontrado');
      err.response = { status: 404 };
      throw err;
    }

    if (placa === 'RSTR0001') {
      return this.buildDTO(this._mockRestrito(placa));
    }

    return this.buildDTO(this._mockDefault(placa));
  }

  _mockDefault(placa) {
    return {
      placa,
      marca:         'VOLKSWAGEN',
      modelo:        'POLO HIGHLINE 200 TSI',
      anoFabricacao: 2022,
      anoModelo:     2023,
      cor:           'BRANCO',
      municipio:     'SÃO PAULO',
      uf:            'SP',
      chassi:        '9BWZZZ377VT004251',
      renavam:       '01234567890',
      tipo:          'AUTOMÓVEL',
      especie:       'PASSAGEIRO',
      categoria:     'PARTICULAR',
      combustivel:   'FLEX',
      situacao:      'REGULAR',
      rouboFurto:    false,
      restricoes:    [],
      multas:        [],
      fipe: {
        codigo:        '005340-6',
        valor:         'R$ 89.500,00',
        referencia:    'Novembro 2024',
        desvalorizacao: '-2.3%',
      },
      fichaTecnica: {
        potencia:          '128 cv',
        torque:            '20,4 kgfm',
        motorizacao:       '1.0 TSI Turbo',
        cambio:            'Automático 6 marchas',
        peso:              '1.215 kg',
        capacidadeTanque:  '50 litros',
        numeroPortas:      4,
        consumoUrbano:     '11,5 km/l',
        consumoRodoviario: '14,2 km/l',
        aceleracao:        '8,9s (0-100 km/h)',
        velocidadeMaxima:  '195 km/h',
        comprimento:       '4.053 mm',
        largura:           '1.751 mm',
        altura:            '1.461 mm',
        entreEixos:        '2.548 mm',
      },
      fotos: [
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
      ],
    };
  }

  _mockRestrito(placa) {
    return {
      ...this._mockDefault(placa),
      placa,
      marca:      'FIAT',
      modelo:     'STRADA FREEDOM 1.3',
      cor:        'PRATA',
      situacao:   'IRREGULAR',
      rouboFurto: true,
      restricoes: [
        'Restrição judicial — Processo nº 0001234-56.2023.8.26.0100',
        'Alienação fiduciária — Banco XYZ',
      ],
      multas: [
        'Infração: Excesso de velocidade — R$ 195,23 — 15/03/2024',
        'Infração: Estacionamento proibido — R$ 88,38 — 02/01/2024',
      ],
    };
  }
}

module.exports = new MockProvider();
