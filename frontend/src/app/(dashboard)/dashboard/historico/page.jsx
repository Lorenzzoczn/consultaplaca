'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Search, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { consultaAPI } from '@/lib/api';
import { formatDate, formatPlate, getStatusLabel } from '@/lib/utils';
import Header from '@/components/layout/Header';

export default function HistoricoPage() {
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchHistorico = async () => {
    setLoading(true);
    try {
      const { data } = await consultaAPI.historico({ page, limit: 20, placa: search || undefined });
      setConsultas(data.data);
      setPagination(data.pagination);
    } catch {
      setConsultas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [page, search]);

  const statusIcon = {
    SUCCESS: <CheckCircle className="w-4 h-4 text-green-400" />,
    NOT_FOUND: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    ERROR: <XCircle className="w-4 h-4 text-red-400" />,
  };

  const statusBadge = {
    SUCCESS: 'badge-success',
    NOT_FOUND: 'badge-warning',
    ERROR: 'badge-danger',
  };

  return (
    <div className="min-h-screen">
      <Header title="Histórico de Consultas" subtitle={`${pagination.total} consultas realizadas`} />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
            <input
              type="text"
              placeholder="Buscar por placa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value.toUpperCase()); setPage(1); }}
              className="input-field pl-10 font-mono"
              maxLength={7}
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider">Placa</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider hidden sm:table-cell">Veículo</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider hidden md:table-cell">Data</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-5 py-4"><div className="skeleton h-5 w-24 rounded" /></td>
                      <td className="px-5 py-4 hidden sm:table-cell"><div className="skeleton h-5 w-40 rounded" /></td>
                      <td className="px-5 py-4"><div className="skeleton h-5 w-20 rounded" /></td>
                      <td className="px-5 py-4 hidden md:table-cell"><div className="skeleton h-5 w-32 rounded" /></td>
                      <td className="px-5 py-4" />
                    </tr>
                  ))
                ) : consultas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <History className="w-10 h-10 text-brand-gray-600 mx-auto mb-3" />
                      <p className="text-brand-gray-400">Nenhuma consulta encontrada</p>
                    </td>
                  </tr>
                ) : (
                  consultas.map((consulta, i) => (
                    <motion.tr
                      key={consulta.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-white">
                          {formatPlate(consulta.placa)}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-brand-gray-300 text-sm">
                          {consulta.resultado?.marca
                            ? `${consulta.resultado.marca} ${consulta.resultado.modelo}`
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ${statusBadge[consulta.status] || 'badge-info'}`}>
                          {statusIcon[consulta.status]}
                          {getStatusLabel(consulta.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-brand-gray-400 text-sm">{formatDate(consulta.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        {consulta.status === 'SUCCESS' && (
                          <Link
                            href={`/dashboard/consulta?placa=${consulta.placa.replace('-', '')}`}
                            className="text-xs text-brand-yellow hover:text-brand-yellow-light transition-colors"
                          >
                            Ver
                          </Link>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
              <p className="text-sm text-brand-gray-400">
                Página {pagination.page} de {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost p-2 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-ghost p-2 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
