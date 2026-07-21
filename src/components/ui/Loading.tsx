import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div 
      className={`rounded-full border-border border-t-primary animate-spin ${sizeClasses[size]} ${className}`} 
      style={{ animationDuration: '0.8s' }}
    />
  );
}

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 space-y-4 ${className}`}>
      <LoadingSpinner size="md" />
      {message && <p className="text-sm text-text-muted font-medium animate-pulse">{message}</p>}
    </div>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={`bg-gradient-to-r from-background-card/50 via-background-card-hover to-background-card/50 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-md ${className}`} 
      style={style}
    />
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 rounded-card border border-border bg-background-card/50 flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 rounded-card border border-border bg-background-card/50 flex flex-col space-y-4 ${className}`}>
      <Skeleton className="h-6 w-1/4" />
      <div className="h-[250px] w-full flex items-end space-x-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className={`w-full rounded-t-md`} style={{ height: `${Math.random() * 60 + 20}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center p-4 rounded-md border border-border bg-background-card/30">
          <Skeleton className="h-10 w-10 rounded-md mr-4 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-8 w-16 ml-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-card border border-border ${className}`}>
      <div className="bg-background-card-hover/50 p-4 border-b border-border flex">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-5 flex-1 mx-2 first:ml-0 last:mr-0" />
        ))}
      </div>
      <div className="divide-y divide-border bg-background-card/30">
        {[...Array(rows)].map((_, r) => (
          <div key={`row-${r}`} className="p-4 flex items-center">
            {[...Array(columns)].map((_, c) => (
              <Skeleton key={`cell-${r}-${c}`} className="h-4 flex-1 mx-2 first:ml-0 last:mr-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex space-x-4 mb-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ListSkeleton count={4} />
      </div>
    </div>
  );
}
