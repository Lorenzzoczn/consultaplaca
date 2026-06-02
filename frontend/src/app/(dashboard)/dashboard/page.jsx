'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Clock, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { consultaAPI } from '@/lib/api';
import { formatDate, formatPlate, getConsultaPercentage } from '@/lib/utils';
import Header from '@/components/layout/Header';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentes, setRecentes] = useState([]);
  const [loadingRecentes, setLoadingRecentes] = useState(true);
  const router = useRouter();

  useEffect(() => {
    consultaAPI.recentes()
      .then(({ data }) => setRecentes(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingRecentes(false));
  }, []);

  const percentage = getConsultaPercentage(user?.consultasUsed, user?.consultasLimit);

  return (
    <div className="min-h-screen">
      <Header
        title={`Olá, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Bem-vindo ao ConsultaPlaca"
      />

      <div className="p-6 space-y-8">
        {/* Hero Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gray-800 to-brand-gray-900 border border-white/10 p-8"
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-yellow/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-yellow/3 rounded-full blur-2xl" />

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse" />
              <span className="text-brand-yellow text-xs font-semibold uppercase tracking-wider">
                Consulta Rápida
              </span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              Consulte qualquer veículo
            </h2>
            <p className="text-brand-gray-400 mb-6">
              Digite a placa e obtenha informações completas em segundos
            </p>

            <QuickSearchBar onSearch={(placa) => router.push(`/dashboard/consulta?placa=${placa}`)} />
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-brand-gray-400 text-sm">Consultas realizadas</span>
              <div className="w-8 h-8 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-brand-yellow" />
              </div>
            </div>
            <p className="text-3xl font-black text-white">{user?.consultasUsed || 0}</p>
            {user?.role !== 'ADMIN' && (
              <div>
                <div className="flex justify-between text-xs text-brand-gray-500 mb-1">
                  <span>Limite mensal</span>
                  <span>{percentage}%</span>
                </div>
                <div className="h-1.5 bg-brand-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${percentage > 80 ? 'bg-red-500' : 'bg-brand-yellow'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-brand-gray-400 text-sm">Limite disponível</span>
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-black text-white">
              {user?.role === 'ADMIN' ? '∞' : Math.max(0, (user?.consultasLimit || 0) - (user?.consultasUsed || 0))}
            </p>
            <p className="text-xs text-brand-gray-500">
              {user?.role === 'ADMIN' ? 'Sem limite' : `de ${user?.consultasLimit} total`}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-brand-gray-400 text-sm">Última consulta</span>
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-white">
              {recentes[0] ? formatDate(recentes[0].createdAt) : '—'}
            </p>
            <p className="text-xs text-brand-gray-500">
              {recentes[0] ? formatPlate(recentes[0].placa) : 'Nenhuma consulta ainda'}
            </p>
          </motion.div>
        </div>

        {/* Recent Consultations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="section-title">Consultas recentes</h3>
            <Link
              href="/dashboard/historico"
              className="flex items-center gap-1 text-sm text-brand-yellow hover:text-brand-yellow-light transition-colors"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loadingRecentes ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : recentes.length === 0 ? (
            <div className="text-center py-10">
              <Search className="w-10 h-10 text-brand-gray-600 mx-auto mb-3" />
              <p className="text-brand-gray-400">Nenhuma consulta realizada ainda</p>
              <Link href="/dashboard/consulta" className="btn-primary inline-flex mt-4 text-sm">
                Fazer primeira consulta
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentes.map((consulta, i) => (
                <motion.div
                  key={consulta.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/dashboard/consulta?placa=${consulta.placa.replace('-', '')}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-brand-gray-800/50 hover:bg-brand-gray-800 border border-transparent hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-yellow/10 rounded-xl flex items-center justify-center">
                        <span className="text-brand-yellow font-mono font-bold text-xs">
                          {consulta.placa.slice(0, 3)}
                        </span>
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white text-sm">
                          {formatPlate(consulta.placa)}
                        </p>
                        {consulta.resultado?.marca && (
                          <p className="text-xs text-brand-gray-400">
                            {consulta.resultado.marca} {consulta.resultado.modelo}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-brand-gray-500">{formatDate(consulta.createdAt)}</span>
                      <ArrowRight className="w-4 h-4 text-brand-gray-600 group-hover:text-brand-yellow transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function QuickSearchBar({ onSearch }) {
  const [placa, setPlaca] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (placa.trim()) onSearch(placa.trim());
  };

  const formatInput = (value) => {
    return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={placa}
        onChange={(e) => setPlaca(formatInput(e.target.value))}
        placeholder="ABC1234"
        className="plate-input flex-1 max-w-xs text-lg py-4"
        maxLength={7}
      />
      <button
        type="submit"
        disabled={placa.length < 7}
        className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Consultar</span>
      </button>
    </form>
  );
}
