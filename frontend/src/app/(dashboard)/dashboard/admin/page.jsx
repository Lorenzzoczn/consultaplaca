'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, TrendingUp, Activity, BarChart3, Clock } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';

export default function AdminStatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Painel Administrativo" />
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Painel Administrativo" subtitle="Visão geral da plataforma" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total de Usuários',
              value: stats?.usuarios?.total || 0,
              sub: `${stats?.usuarios?.ativos || 0} ativos`,
              icon: Users,
              color: 'text-blue-400',
              bg: 'bg-blue-500/20',
            },
            {
              label: 'Total de Consultas',
              value: stats?.consultas?.total || 0,
              sub: 'desde o início',
              icon: Search,
              color: 'text-brand-yellow',
              bg: 'bg-brand-yellow/20',
            },
            {
              label: 'Consultas Hoje',
              value: stats?.consultas?.hoje || 0,
              sub: 'nas últimas 24h',
              icon: Activity,
              color: 'text-green-400',
              bg: 'bg-green-500/20',
            },
            {
              label: 'Consultas na Semana',
              value: stats?.consultas?.semana || 0,
              sub: 'últimos 7 dias',
              icon: TrendingUp,
              color: 'text-purple-400',
              bg: 'bg-purple-500/20',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-brand-gray-400 text-sm">{stat.label}</span>
                <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-black text-white">{stat.value.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-brand-gray-500">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-5"
          >
            <h3 className="section-title mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-yellow" />
              Top Usuários
            </h3>
            <div className="space-y-3">
              {stats?.topUsers?.map((user, i) => (
                <div key={user.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-brand-gray-500">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-brand-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-yellow">{user.consultasUsed}</p>
                    <p className="text-xs text-brand-gray-500">consultas</p>
                  </div>
                </div>
              ))}
              {(!stats?.topUsers || stats.topUsers.length === 0) && (
                <p className="text-brand-gray-500 text-sm text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
          </motion.div>

          {/* Recent Consultations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card p-5"
          >
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-yellow" />
              Consultas Recentes
            </h3>
            <div className="space-y-2">
              {stats?.recentConsultas?.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <span className="font-mono font-bold text-white text-sm">{c.placa}</span>
                    <p className="text-xs text-brand-gray-400">{c.user?.name}</p>
                  </div>
                  <span className="text-xs text-brand-gray-500">{formatDate(c.createdAt)}</span>
                </div>
              ))}
              {(!stats?.recentConsultas || stats.recentConsultas.length === 0) && (
                <p className="text-brand-gray-500 text-sm text-center py-4">Nenhuma consulta recente</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
