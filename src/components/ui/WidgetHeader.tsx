import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import Badge from './Badge';

export interface WidgetHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string | number;
  action?: ReactNode;
  menu?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  className?: string;
}

export default function WidgetHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  action,
  menu,
  iconBg,
  iconColor,
  className = '',
}: WidgetHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 px-5 pt-5 pb-0 min-h-[40px] shrink-0 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div 
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-primary/10 text-primary"
            style={{
              ...(iconBg ? { background: iconBg } : {}),
              ...(iconColor ? { color: iconColor } : {}),
            }}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-space font-bold text-[13px] text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              {title}
            </h3>
            {badge !== undefined && badge !== null && (
              <Badge variant="purple" size="sm" className="uppercase tracking-wide font-extrabold">
                {badge}
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {(action || menu) && (
        <div className="flex items-center gap-1.5 shrink-0">
          {action}
          {menu}
        </div>
      )}
    </div>
  );
}
