import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'card';
  elevation?: 'none' | '1' | '2' | '3';
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  radius = 'card',
  elevation = '1',
  className = '',
  ...props
}: CardProps) {
  const baseClasses = 'bg-background-card backdrop-blur-xl border border-border transition-all duration-normal';
  
  const variantClasses = {
    default: 'hover:bg-background-card-hover',
    glow: 'hover:bg-background-card-hover hover:border-primary/20 hover:shadow-glow',
    outline: 'bg-transparent border-border',
    ghost: 'bg-transparent border-transparent hover:bg-background-card',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  const radiusClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    card: 'rounded-card',
  };
  
  const elevationClasses = {
    none: 'shadow-none',
    '1': 'shadow-elevation1 hover:-translate-y-px',
    '2': 'shadow-elevation2 hover:-translate-y-1',
    '3': 'shadow-elevation3 hover:-translate-y-2',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${radiusClasses[radius]} ${elevationClasses[elevation]} ${className}`;

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
