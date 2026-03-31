import React, { useRef } from 'react';
import { formatBRL, parseBRL } from './currency';

interface CurrencyInputProps {
  value: string;
  onChange: (raw: string, formatted: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className = '',
  label,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayed = value ? formatBRL(value) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseBRL(e.target.value);
    const formatted = formatBRL(raw);
    onChange(raw, formatted);

    // Keep cursor at end
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd   = inputRef.current.value.length;
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace to delete last digit
    if (e.key === 'Backspace') {
      e.preventDefault();
      const raw = parseBRL(value);
      const newRaw = raw.slice(0, -1);
      onChange(newRaw, formatBRL(newRaw));
    }
  };

  return (
    <div>
      {label && <label className="text-xs text-gray-500 block mb-1">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayed}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-gray-500 transition-colors ${className}`}
      />
    </div>
  );
};
