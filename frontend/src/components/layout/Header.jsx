'use client';

import { useAuth } from '@/hooks/useAuth';
import { Bell, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Header({ title, subtitle }) {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-brand-black/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        {title && <h1 className="text-lg font-bold text-white">{title}</h1>}
        {subtitle && <p className="text-xs text-brand-gray-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-brand-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
        </div>
        <div className="w-9 h-9 bg-brand-yellow/20 border border-brand-yellow/30 rounded-xl flex items-center justify-center">
          <User className="w-4 h-4 text-brand-yellow" />
        </div>
      </div>
    </header>
  );
}
