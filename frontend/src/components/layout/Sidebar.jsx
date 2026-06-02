'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutDashboard, History, Users, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Settings, Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/consulta', icon: Search, label: 'Consultar Placa' },
  { href: '/dashboard/historico', icon: History, label: 'Histórico' },
];

const adminItems = [
  { href: '/dashboard/admin', icon: BarChart3, label: 'Estatísticas', exact: true },
  { href: '/dashboard/admin/usuarios', icon: Users, label: 'Usuários' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    toast.success('Até logo!');
    router.push('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col bg-brand-gray-900 border-r border-white/5 h-screen sticky top-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 h-16 border-b border-white/5">
        <div className="w-9 h-9 bg-brand-yellow rounded-xl flex items-center justify-center flex-shrink-0">
          <Search className="w-4 h-4 text-brand-black" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold text-white text-sm whitespace-nowrap"
            >
              ConsultaPlaca
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
        ))}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-white/5" />
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-brand-gray-500 uppercase tracking-wider">
                Admin
              </p>
            )}
            {adminItems.map((item) => (
              <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-brand-gray-400 truncate">{user.email}</p>
            {user.role !== 'ADMIN' && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-brand-gray-400 mb-1">
                  <span>Consultas</span>
                  <span>{user.consultasUsed}/{user.consultasLimit}</span>
                </div>
                <div className="h-1 bg-brand-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-yellow rounded-full transition-all"
                    style={{ width: `${Math.min((user.consultasUsed / user.consultasLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-brand-gray-400',
            'hover:bg-red-500/10 hover:text-red-400 transition-all duration-200',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-gray-700 border border-white/10 rounded-full flex items-center justify-center hover:bg-brand-gray-600 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-brand-gray-300" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-brand-gray-300" />
        )}
      </button>
    </motion.aside>
  );
}

function NavItem({ item, collapsed, pathname }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
        isActive
          ? 'bg-brand-yellow/15 text-brand-yellow'
          : 'text-brand-gray-400 hover:bg-white/5 hover:text-white',
        collapsed && 'justify-center'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-brand-yellow')} />
      {!collapsed && (
        <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
      )}
      {isActive && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 bg-brand-yellow rounded-full" />
      )}
    </Link>
  );
}
