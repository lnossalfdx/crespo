import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'md',
}) => {
  const baseClasses = `
    bg-gray-900 border border-gray-800 rounded-xl
    ${paddingClasses[padding]}
    ${hover ? 'cursor-pointer' : ''}
    ${className}
  `;

  if (hover || onClick) {
    return (
      <motion.div
        className={baseClasses}
        whileHover={{ borderColor: 'rgba(102,102,102,0.5)', y: -1 }}
        transition={{ duration: 0.15 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses}>{children}</div>;
};
