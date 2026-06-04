"use client";

import { useState, ChangeEvent } from 'react';

export interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, label, error, disabled }: CurrencyInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  const handleBlur = () => {
    let parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    setInputValue(parsed.toString());
    onChange(parsed);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setInputValue(val);
      if (val !== '' && val !== '.') {
        onChange(parseFloat(val));
      } else {
        onChange(0);
      }
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}</label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-[var(--text-secondary)] text-sm">₹</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          className={`block w-full pl-7 pr-3 py-2 text-sm border rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none transition-shadow ${
            error
              ? 'border-[var(--danger)] text-[var(--danger)] focus:border-[var(--danger)]'
              : 'border-[var(--border)] focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder="0.00"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
