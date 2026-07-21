import React, { HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  icon?: LucideIcon;
  size?: 'sm' | 'md';
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  className = '',
  ...props
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full whitespace-nowrap transition-colors';
  
  const variantClasses = {
    default: 'bg-background-card text-text-secondary border border-border',
    success: 'bg-semantic-success/10 text-semantic-success border border-semantic-success/20',
    warning: 'bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/20',
    danger: 'bg-semantic-danger/10 text-semantic-danger border border-semantic-danger/20',
    info: 'bg-semantic-info/10 text-semantic-info border border-semantic-info/20',
    purple: 'bg-primary/10 text-primary border border-primary/20',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <div className={classes} {...props}>
      {Icon && <Icon size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />}
      {children}
    </div>
  );
}
