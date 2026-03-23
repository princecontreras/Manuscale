import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'action' | 'neutral' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-md shadow-primary-500/20",
    action: "bg-action-600 text-white hover:bg-action-700 focus:ring-action-500 shadow-md shadow-action-500/20",
    neutral: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md shadow-red-500/20",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading && <Loader2 className="mr-2 animate-spin" size={16} />}
      {children}
    </button>
  );
};
