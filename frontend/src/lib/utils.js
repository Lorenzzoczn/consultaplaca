import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPlate(placa) {
  if (!placa) return '';
  const clean = placa.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

export function formatDate(date, options = {}) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(date));
}

export function formatDateShort(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function getStatusColor(status) {
  const map = {
    REGULAR: 'success',
    IRREGULAR: 'danger',
    ROUBADO: 'danger',
    FURTADO: 'danger',
    PENDENTE: 'warning',
    SUCCESS: 'success',
    NOT_FOUND: 'warning',
    ERROR: 'danger',
  };
  return map[status] || 'info';
}

export function getStatusLabel(status) {
  const map = {
    REGULAR: 'Regular',
    IRREGULAR: 'Irregular',
    ROUBADO: 'Roubado',
    FURTADO: 'Furtado',
    PENDENTE: 'Pendente',
    SUCCESS: 'Sucesso',
    NOT_FOUND: 'Não encontrado',
    ERROR: 'Erro',
  };
  return map[status] || status;
}

export function getRoleLabel(role) {
  const map = {
    ADMIN: 'Administrador',
    USER: 'Usuário',
    VIEWER: 'Visualizador',
  };
  return map[role] || role;
}

export function getRoleColor(role) {
  const map = {
    ADMIN: 'yellow',
    USER: 'info',
    VIEWER: 'warning',
  };
  return map[role] || 'info';
}

export function maskString(str, visibleStart = 3, visibleEnd = 3) {
  if (!str) return '-';
  const s = str.toString();
  if (s.length <= visibleStart + visibleEnd) return s;
  return s.slice(0, visibleStart) + '•'.repeat(s.length - visibleStart - visibleEnd) + s.slice(-visibleEnd);
}

export function getConsultaPercentage(used, limit) {
  if (!limit) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}
