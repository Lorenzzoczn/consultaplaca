'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Search, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter letra maiúscula')
    .regex(/[a-z]/, 'Deve conter letra minúscula')
    .regex(/[0-9]/, 'Deve conter número'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');

  const passwordChecks = [
    { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    { label: 'Letra maiúscula',     valid: /[A-Z]/.test(password) },
    { label: 'Letra minúscula',     valid: /[a-z]/.test(password) },
    { label: 'Número',              valid: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Chama o endpoint real de registro
      const { data: res } = await authAPI.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      const { token, user: userData } = res.data;

      // Salva token e autentica (secure: false em localhost)
      const isProduction = process.env.NODE_ENV === 'production';
      Cookies.set('cp_token', token, {
        expires: 7,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
      });

      updateUser(userData);
      toast.success(`Conta criada! Bem-vindo, ${userData.name.split(' ')[0]}!`);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao criar conta';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-brand-yellow rounded-xl flex items-center justify-center">
            <Search className="w-4 h-4 text-brand-black" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white">ConsultaPlaca</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Criar conta</h2>
          <p className="mt-2 text-brand-gray-400">Solicite acesso à plataforma</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-gray-200 mb-2">Nome completo</label>
            <input {...register('name')} type="text" placeholder="Seu nome" className="input-field" autoComplete="name" />
            {errors.name && <p className="mt-1.5 text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-gray-200 mb-2">Email</label>
            <input {...register('email')} type="email" placeholder="seu@email.com" className="input-field" autoComplete="email" />
            {errors.email && <p className="mt-1.5 text-red-400 text-xs">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-gray-200 mb-2">Senha</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-field pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {passwordChecks.map(({ label, valid }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-xs ${valid ? 'text-green-400' : 'text-brand-gray-500'}`}>
                    <CheckCircle className={`w-3 h-3 ${valid ? 'text-green-400' : 'text-brand-gray-600'}`} />
                    {label}
                  </div>
                ))}
              </div>
            )}
            {errors.password && <p className="mt-1.5 text-red-400 text-xs">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-gray-200 mb-2">Confirmar senha</label>
            <input
              {...register('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-red-400 text-xs">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-gray-400">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-yellow hover:text-brand-yellow-light font-medium transition-colors">
            Fazer login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
