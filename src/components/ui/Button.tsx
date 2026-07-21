import React, { ButtonHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-normal rounded-md disabled:opacity-50 disabled:pointer-events-none outline-none';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-secondary shadow-glow',
    secondary: 'bg-background-card hover:bg-background-card-hover text-text-primary border border-border',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-background-card',
    outline: 'bg-transparent text-text-primary border border-border hover:border-primary hover:bg-primary/10',
    danger: 'bg-transparent text-semantic-danger border border-semantic-danger/30 hover:bg-semantic-danger/10 hover:border-semantic-danger',
    icon: 'p-2 bg-transparent text-text-secondary hover:text-text-primary hover:bg-background-card rounded-md',
  };

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
    icon: 'p-2', // Override padding for icon-only buttons
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${variant === 'icon' ? sizeClasses.icon : sizeClasses[size]} ${className}`;

  return (
    <button 
      className={classes} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className={children ? 'mr-2' : ''} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} strokeWidth={2} />
      ) : null}
      {children}
    </button>
  );
}
