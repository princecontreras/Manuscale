import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'neutral';
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
  // Base styles - consistent across all variants
  const baseStyles = "inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap";
  
  // Variant styles with consistent typography and colors
  const variants = {
    // Primary: Brand purple - highest emphasis
    primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500 shadow-sm hover:shadow-md",
    
    // Secondary: Brand blue - medium emphasis
    secondary: "bg-action-600 text-white hover:bg-action-700 active:bg-action-800 focus:ring-action-500 shadow-sm hover:shadow-md",
    
    // Ghost: Text only - lowest emphasis, no background
    ghost: "text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-300",
    
    // Neutral: Outline style - medium-low emphasis
    neutral: "bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus:ring-slate-300",
    
    // Danger: Red for destructive actions
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm hover:shadow-md",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs leading-tight tracking-wide",
    md: "px-4 py-2 text-sm leading-normal",
    lg: "px-6 py-3 text-base leading-normal",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />}
      {children}
    </button>
  );
};
