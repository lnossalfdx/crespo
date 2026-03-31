import React from 'react';
import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-white">{label}</span>}
          {description && <span className="text-xs text-gray-500 mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-white' : 'bg-gray-700'}
        `}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            inline-block h-5 w-5 transform rounded-full shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'bg-black translate-x-5' : 'bg-gray-400 translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};
