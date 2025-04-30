'use client';

import React from 'react';

interface InputProps {
  id?: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  type,
  placeholder,
  value,
  onChange,
  className = '',
  disabled = false,
  error,
}) => {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-dark-900 text-white ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
    />
  );
};

export default Input; 