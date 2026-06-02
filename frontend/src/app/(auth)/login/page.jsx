'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Car, Zap, Shield, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Bem-vindo, ${user.name.split(' ')[0]}!`);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao fazer login';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-gray-900 to-brand-black">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />

        {/* Yellow glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-yellow rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-brand-black" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-white">ConsultaPlaca</span>
          </div>

          {/* Center content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-black text-white leading-tight">
                Consulta veicular
                <br />
                <span className="text-gradient-yellow">premium</span>
              </h1>
              <p className="mt-4 text-brand-gray-300 text-lg leading-relaxed">
                Acesse informações completas de qualquer veículo brasileiro em segundos.
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              {[
                { icon: Zap, text: 'Resultados em tempo real' },
                { icon: Shield, text: 'Dados seguros e criptografados' },
                { icon: Car, text: 'Ficha técnica completa + FIPE' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-yellow/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-brand-yellow" />
                  </div>
                  <span className="text-brand-gray-200 text-sm">{text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom */}
          <p className="text-brand-gray-500 text-sm">
            © 2024 ConsultaPlaca. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-yellow rounded-xl flex items-center justify-center">
              <Search className="w-4 h-4 text-brand-black" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-white">ConsultaPlaca</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Entrar</h2>
            <p className="mt-2 text-brand-gray-400">
              Acesse sua conta para consultar veículos
            </p>
            {searchParams.get('expired') && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">Sua sessão expirou. Faça login novamente.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-brand-gray-200 mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                className="input-field"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1.5 text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-brand-gray-200">Senha</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-yellow hover:text-brand-yellow-light transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-red-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na plataforma'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-brand-gray-800/50 border border-brand-gray-700 rounded-xl">
            <p className="text-xs text-brand-gray-400 font-medium mb-2">Credenciais de demonstração:</p>
            <div className="space-y-1">
              <p className="text-xs text-brand-gray-300">
                <span className="text-brand-yellow">Admin:</span> admin@consultaplaca.com / Admin@123456
              </p>
              <p className="text-xs text-brand-gray-300">
                <span className="text-brand-yellow">Demo:</span> demo@consultaplaca.com / Demo@123456
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-brand-gray-400">
            Não tem conta?{' '}
            <Link href="/register" className="text-brand-yellow hover:text-brand-yellow-light font-medium transition-colors">
              Solicitar acesso
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
