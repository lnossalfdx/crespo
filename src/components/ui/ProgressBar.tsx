import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  color?: 'white' | 'green' | 'blue' | 'yellow' | 'red';
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const colorClasses = {
  white: 'bg-white',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  className = '',
  showLabel = false,
  color = 'white',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex-1 bg-gray-800 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${colorClasses[color]}`}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 w-8 text-right">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};
