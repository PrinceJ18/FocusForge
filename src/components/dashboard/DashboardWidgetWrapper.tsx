import React, { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface DashboardWidgetWrapperProps {
  id: string;
  title: string;
  icon: LucideIcon;
  size: { w: number; h: number; colSpan?: number };
  visible: boolean;
  actions?: ReactNode;
  onResizeStart?: () => void;
  onDragStart?: () => void;
  children: ReactNode;
}

export default function DashboardWidgetWrapper({
  id,
  title,
  icon,
  size,
  visible,
  actions,
  onResizeStart,
  onDragStart,
  children
}: DashboardWidgetWrapperProps) {
  if (!visible) {
    return null;
  }

  return (
    <div 
      className="dashboard-widget-wrapper"
      data-widget-id={id}
      data-widget-title={title}
      // Future-proofing attributes
      data-draggable="true"
      data-resizable="true"
      // style={{ gridColumn: `span ${size.colSpan || size.w}` }} // If we want the wrapper to control grid
      style={{ display: 'contents' }} // Let the inner DashboardWidget control the grid for now
    >
      {/* 
        This wrapper currently passes through layout visually by using display: contents.
        In the future, it will provide drag handles and resize overlays here.
      */}
      {children}
    </div>
  );
}
