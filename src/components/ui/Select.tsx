import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`
              w-full bg-gray-800 border rounded-lg text-white
              text-sm px-3 py-2.5 pr-10 outline-none appearance-none
              transition-all duration-150 cursor-pointer
              focus:border-gray-500 focus:ring-1 focus:ring-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-700'}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" className="bg-gray-900">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
