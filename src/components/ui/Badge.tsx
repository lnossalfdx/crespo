import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'novo'
  | 'qualificando'
  | 'proposta'
  | 'negociacao'
  | 'ganho'
  | 'perdido'
  | 'ativo'
  | 'inativo'
  | 'prospecto'
  | 'em_andamento'
  | 'concluido'
  | 'pausado';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-700 text-gray-300',
  success: 'bg-green-900/50 text-green-400 border border-green-800',
  warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
  danger: 'bg-red-900/50 text-red-400 border border-red-800',
  info: 'bg-blue-900/50 text-blue-400 border border-blue-800',
  novo: 'bg-gray-700/60 text-gray-300 border border-gray-600',
  qualificando: 'bg-blue-900/50 text-blue-300 border border-blue-800',
  proposta: 'bg-purple-900/50 text-purple-300 border border-purple-800',
  negociacao: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
  ganho: 'bg-green-900/50 text-green-300 border border-green-800',
  perdido: 'bg-red-900/50 text-red-300 border border-red-800',
  ativo: 'bg-green-900/50 text-green-300 border border-green-800',
  inativo: 'bg-gray-700/60 text-gray-400 border border-gray-600',
  prospecto: 'bg-blue-900/50 text-blue-300 border border-blue-800',
  em_andamento: 'bg-blue-900/50 text-blue-300 border border-blue-800',
  concluido: 'bg-green-900/50 text-green-300 border border-green-800',
  pausado: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};
