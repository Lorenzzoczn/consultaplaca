'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Edit2, Trash2, RefreshCw,
  X, Check, Shield, User, Eye
} from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { formatDate, getRoleLabel, getRoleColor } from '@/lib/utils';
import Header from '@/components/layout/Header';
import toast from 'react-hot-toast';

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'create' | { type: 'edit', user }
  const [deleting, setDeleting] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page, limit: 20, search: search || undefined });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteUser(id);
      toast.success('Usuário excluído');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao excluir');
    } finally {
      setDeleting(null);
    }
  };

  const handleResetConsultas = async (id) => {
    try {
      await adminAPI.resetConsultas(id);
      toast.success('Contador resetado');
      fetchUsers();
    } catch {
      toast.error('Erro ao resetar');
    }
  };

  const roleIcon = { ADMIN: Shield, USER: User, VIEWER: Eye };

  return (
    <div className="min-h-screen">
      <Header title="Gerenciar Usuários" subtitle={`${pagination.total} usuários cadastrados`} />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setModal('create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Usuário', 'Perfil', 'Consultas', 'Status', 'Último Login', 'Ações'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-brand-gray-400 uppercase tracking-wider first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="skeleton h-5 rounded" style={{ width: `${60 + j * 10}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Users className="w-10 h-10 text-brand-gray-600 mx-auto mb-3" />
                      <p className="text-brand-gray-400">Nenhum usuário encontrado</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user, i) => {
                    const RoleIcon = roleIcon[user.role] || User;
                    const roleColorMap = { ADMIN: 'badge-yellow', USER: 'badge-info', VIEWER: 'badge-warning' };
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-white text-sm">{user.name}</p>
                            <p className="text-xs text-brand-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`badge ${roleColorMap[user.role] || 'badge-info'}`}>
                            <RoleIcon className="w-3 h-3" />
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm text-white font-medium">
                              {user.consultasUsed} / {user.consultasLimit}
                            </p>
                            <div className="h-1 bg-brand-gray-700 rounded-full mt-1 w-20">
                              <div
                                className="h-full bg-brand-yellow rounded-full"
                                style={{ width: `${Math.min((user.consultasUsed / user.consultasLimit) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {user.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-brand-gray-400">
                            {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setModal({ type: 'edit', user })}
                              className="p-1.5 text-brand-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleResetConsultas(user.id)}
                              className="p-1.5 text-brand-gray-400 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-lg transition-all"
                              title="Resetar consultas"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={deleting === user.id}
                              className="p-1.5 text-brand-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {modal && (
          <UserModal
            mode={modal === 'create' ? 'create' : 'edit'}
            user={modal?.user}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); fetchUsers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserModal({ mode, user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'USER',
    consultasLimit: user?.consultasLimit || 100,
    isActive: user?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'create') {
        await adminAPI.createUser(form);
        toast.success('Usuário criado com sucesso');
      } else {
        const { email, ...updateData } = form;
        if (!updateData.password) delete updateData.password;
        await adminAPI.updateUser(user.id, updateData);
        toast.success('Usuário atualizado');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-brand-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">
            {mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
          </h3>
          <button onClick={onClose} className="text-brand-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-gray-200 mb-1.5">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              required
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-brand-gray-200 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-brand-gray-200 mb-1.5">
              {mode === 'create' ? 'Senha' : 'Nova senha (deixe em branco para manter)'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-field"
              required={mode === 'create'}
              minLength={8}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-gray-200 mb-1.5">Perfil</label>
              <select
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                className="input-field"
              >
                <option value="USER">Usuário</option>
                <option value="ADMIN">Administrador</option>
                <option value="VIEWER">Visualizador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-gray-200 mb-1.5">Limite</label>
              <input
                type="number"
                value={form.consultasLimit}
                onChange={(e) => setForm(f => ({ ...f, consultasLimit: parseInt(e.target.value) }))}
                className="input-field"
                min={0}
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-brand-yellow' : 'bg-brand-gray-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-brand-gray-300">
                {form.isActive ? 'Conta ativa' : 'Conta inativa'}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
              ) : (
                mode === 'create' ? 'Criar' : 'Salvar'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
