import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button, { ButtonProps } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-card border border-dashed border-border bg-background-card/30 ${className}`}>
      <div className="h-12 w-12 rounded-full bg-background-card border border-border flex items-center justify-center text-text-muted mb-2">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      {action && (
        <div className="pt-2">
          <Button 
            variant={action.variant || 'primary'} 
            onClick={action.onClick}
            icon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
