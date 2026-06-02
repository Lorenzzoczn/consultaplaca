'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Mail } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-brand-yellow rounded-xl flex items-center justify-center">
            <Search className="w-4 h-4 text-brand-black" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white">ConsultaPlaca</span>
        </div>

        {!sent ? (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white">Recuperar senha</h2>
              <p className="mt-2 text-brand-gray-400">
                Digite seu email e enviaremos as instruções de recuperação.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-brand-gray-200 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-field"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Enviar instruções'
                )}
              </button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-brand-yellow" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Email enviado!</h3>
            <p className="text-brand-gray-400 text-sm">
              Se este email estiver cadastrado, você receberá as instruções em breve.
            </p>
          </motion.div>
        )}

        <Link
          href="/login"
          className="flex items-center gap-2 mt-6 text-sm text-brand-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>
      </motion.div>
    </div>
  );
}
