'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Car, MapPin, Fuel, Calendar, Hash, Shield,
  AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Gauge, Zap, Weight, Droplets, DoorOpen, Camera, TrendingUp
} from 'lucide-react';
import { consultaAPI } from '@/lib/api';
import { formatPlate, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import toast from 'react-hot-toast';

export default function ConsultaPage() {
  const [placa, setPlaca] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();

  useEffect(() => {
    const placaParam = searchParams.get('placa');
    if (placaParam) {
      const formatted = placaParam.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
      setPlaca(formatted);
      if (formatted.length === 7) {
        doConsulta(formatted);
      }
    }
    inputRef.current?.focus();
  }, []);

  const formatInput = (value) => {
    return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
  };

  const doConsulta = async (placaToSearch) => {
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const { data } = await consultaAPI.consultar(placaToSearch);
      setResultado(data.data);
      updateUser({ consultasUsed: data.meta?.consultasUsed });
      toast.success('Consulta realizada com sucesso!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao consultar veículo';
      const code = err.response?.data?.code;

      if (err.response?.status === 404) {
        setError({ type: 'not_found', message: 'Veículo não encontrado para esta placa' });
      } else if (code === 'QUOTA_EXCEEDED') {
        setError({ type: 'quota', message: msg });
      } else {
        setError({ type: 'error', message: msg });
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (placa.length < 7) {
      toast.error('Digite uma placa válida com 7 caracteres');
      return;
    }
    doConsulta(placa);
  };

  return (
    <div className="min-h-screen">
      <Header title="Consultar Placa" subtitle="Busque informações completas de qualquer veículo" />

      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Search Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <div className="absolute inset-0 bg-brand-yellow/5 rounded-3xl blur-xl" />
              <div className="relative glass-card p-6">
                <label className="block text-center text-sm font-semibold text-brand-gray-300 mb-4 uppercase tracking-widest">
                  Digite a placa do veículo
                </label>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                  {/* Brazilian plate visual */}
                  <div className="bg-white rounded-2xl p-3 shadow-2xl border-4 border-brand-gray-700 w-64">
                    <div className="bg-blue-600 rounded-t-lg px-2 py-1 flex items-center justify-between mb-2">
                      <span className="text-white text-xs font-bold">BRASIL</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                        <div className="w-2 h-2 bg-blue-300 rounded-full" />
                      </div>
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={placa}
                      onChange={(e) => setPlaca(formatInput(e.target.value))}
                      placeholder="ABC1234"
                      className="w-full bg-transparent text-brand-black text-3xl font-black font-mono tracking-[0.3em] text-center border-none outline-none placeholder-gray-300 uppercase"
                      maxLength={7}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || placa.length < 7}
                    className="btn-primary flex items-center gap-3 px-8 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                        Consultando...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Consultar
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-xs text-brand-gray-500 mt-4">
                  Formatos aceitos: ABC-1234 (antigo) ou ABC1D23 (Mercosul)
                </p>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-12 text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-brand-yellow/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
                <Car className="absolute inset-0 m-auto w-8 h-8 text-brand-yellow" />
              </div>
              <p className="text-white font-semibold text-lg">Consultando veículo...</p>
              <p className="text-brand-gray-400 text-sm mt-1">Buscando informações na base de dados</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`glass-card p-8 text-center border ${
                error.type === 'not_found' ? 'border-yellow-500/30' : 'border-red-500/30'
              }`}
            >
              {error.type === 'not_found' ? (
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              )}
              <p className="text-white font-semibold">{error.message}</p>
              {error.type === 'not_found' && (
                <p className="text-brand-gray-400 text-sm mt-1">
                  Verifique se a placa foi digitada corretamente
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {resultado && !loading && (
            <VehicleResult data={resultado} placa={placa} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function VehicleResult({ data, placa }) {
  const [showFicha, setShowFicha] = useState(false);

  const situacaoColor = {
    REGULAR: 'text-green-400',
    IRREGULAR: 'text-red-400',
    ROUBADO: 'text-red-400',
    FURTADO: 'text-red-400',
  }[data.situacao] || 'text-yellow-400';

  const situacaoIcon = data.situacao === 'REGULAR'
    ? <CheckCircle className="w-5 h-5 text-green-400" />
    : <XCircle className="w-5 h-5 text-red-400" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header Card */}
      <div className="glass-card p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-yellow/15 border border-brand-yellow/30 rounded-2xl flex items-center justify-center">
              <Car className="w-7 h-7 text-brand-yellow" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-black text-2xl text-white tracking-wider">
                  {formatPlate(data.placa || placa)}
                </span>
                <span className={`badge ${data.situacao === 'REGULAR' ? 'badge-success' : 'badge-danger'}`}>
                  {situacaoIcon}
                  {data.situacao}
                </span>
              </div>
              <p className="text-brand-gray-300 font-semibold">
                {data.marca} {data.modelo}
              </p>
              <p className="text-brand-gray-500 text-sm">
                {data.anoFabricacao}/{data.anoModelo} • {data.cor}
              </p>
            </div>
          </div>

          {data.fipe && (
            <div className="text-right">
              <p className="text-xs text-brand-gray-500 mb-1">Valor FIPE</p>
              <p className="text-2xl font-black text-brand-yellow">{data.fipe.valor}</p>
              <p className="text-xs text-brand-gray-500">{data.fipe.referencia}</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-yellow" />
            Dados do Veículo
          </h3>
          <div className="space-y-3">
            <InfoRow label="Marca" value={data.marca} />
            <InfoRow label="Modelo" value={data.modelo} />
            <InfoRow label="Ano Fab./Mod." value={`${data.anoFabricacao}/${data.anoModelo}`} />
            <InfoRow label="Cor" value={data.cor} />
            <InfoRow label="Tipo" value={data.tipo} />
            <InfoRow label="Espécie" value={data.especie} />
            <InfoRow label="Categoria" value={data.categoria} />
            <InfoRow label="Combustível" value={data.combustivel} />
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-yellow" />
            Dados de Registro
          </h3>
          <div className="space-y-3">
            <InfoRow label="Município" value={data.municipio} />
            <InfoRow label="UF" value={data.uf} />
            <InfoRow label="Chassi" value={data.chassi} mono />
            <InfoRow label="RENAVAM" value={data.renavam} mono />
            <InfoRow
              label="Situação"
              value={<span className={`font-semibold ${situacaoColor}`}>{data.situacao}</span>}
            />
          </div>
        </div>
      </div>

      {/* Restrictions & Alerts */}
      {(data.restricoes?.length > 0 || data.rouboFurto || data.multas?.length > 0) && (
        <div className="glass-card p-5 border border-red-500/20">
          <h3 className="section-title mb-4 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            Alertas e Restrições
          </h3>
          <div className="space-y-2">
            {data.rouboFurto && (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-300 font-semibold">Veículo com ocorrência de roubo/furto</span>
              </div>
            )}
            {data.restricoes?.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-yellow-300 text-sm">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIPE */}
      {data.fipe && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-yellow" />
            Tabela FIPE
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Código FIPE', value: data.fipe.codigo, mono: true },
              { label: 'Valor', value: data.fipe.valor, highlight: true },
              { label: 'Referência', value: data.fipe.referencia },
              { label: 'Variação', value: data.fipe.desvalorizacao, colored: true },
            ].map(({ label, value, mono, highlight, colored }) => (
              <div key={label} className={`text-center p-4 rounded-xl ${highlight ? 'bg-brand-yellow/10 border border-brand-yellow/20' : 'bg-brand-gray-800/50'}`}>
                <p className="text-xs text-brand-gray-400 mb-1">{label}</p>
                <p className={`font-bold text-sm ${highlight ? 'text-brand-yellow' : colored ? (value?.startsWith('-') ? 'text-red-400' : 'text-green-400') : 'text-white'} ${mono ? 'font-mono' : ''}`}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Sheet */}
      {data.fichaTecnica && (
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setShowFicha(!showFicha)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
          >
            <h3 className="section-title flex items-center gap-2">
              <Gauge className="w-4 h-4 text-brand-yellow" />
              Ficha Técnica
            </h3>
            {showFicha ? <ChevronUp className="w-5 h-5 text-brand-gray-400" /> : <ChevronDown className="w-5 h-5 text-brand-gray-400" />}
          </button>

          <AnimatePresence>
            {showFicha && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { icon: Zap, label: 'Potência', value: data.fichaTecnica.potencia },
                    { icon: Gauge, label: 'Torque', value: data.fichaTecnica.torque },
                    { icon: Car, label: 'Motor', value: data.fichaTecnica.motorizacao },
                    { icon: Car, label: 'Câmbio', value: data.fichaTecnica.cambio },
                    { icon: Weight, label: 'Peso', value: data.fichaTecnica.peso },
                    { icon: Droplets, label: 'Tanque', value: data.fichaTecnica.capacidadeTanque },
                    { icon: DoorOpen, label: 'Portas', value: data.fichaTecnica.numeroPortas },
                    { icon: Fuel, label: 'Consumo Urb.', value: data.fichaTecnica.consumoUrbano },
                    { icon: Fuel, label: 'Consumo Rod.', value: data.fichaTecnica.consumoRodoviario },
                    { icon: Zap, label: 'Aceleração', value: data.fichaTecnica.aceleracao },
                    { icon: Gauge, label: 'Vel. Máxima', value: data.fichaTecnica.velocidadeMaxima },
                  ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="p-3 bg-brand-gray-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3 h-3 text-brand-yellow" />
                        <span className="text-xs text-brand-gray-400">{label}</span>
                      </div>
                      <p className="font-semibold text-white text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Photos */}
      {data.fotos?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand-yellow" />
            Fotos Ilustrativas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.fotos.map((foto, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden bg-brand-gray-800">
                <img
                  src={foto}
                  alt={`${data.marca} ${data.modelo}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-gray-500 mt-2 text-center">
            * Imagens ilustrativas do modelo. Podem não representar o veículo exato.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-brand-gray-400 text-sm">{label}</span>
      <span className={`text-white text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
