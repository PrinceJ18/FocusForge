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
      {message && <p className="text-sm text-slate-400 font-medium animate-pulse">{message}</p>}
    </div>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={`bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-md ${className}`} 
      style={style}
    />
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col space-y-4 ${className}`}>
      <Skeleton className="h-5 w-1/4" />
      <div className="h-[220px] w-full flex items-end space-x-2 pt-4">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="w-full rounded-t-md" style={{ height: `${(i % 3 + 1) * 28 + 20}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <Skeleton className="h-10 w-10 rounded-xl mr-4 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-16 ml-4 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-white/5 ${className}`}>
      <div className="bg-white/[0.03] p-4 border-b border-white/5 flex">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1 mx-2 first:ml-0 last:mr-0" />
        ))}
      </div>
      <div className="divide-y divide-white/5 bg-white/[0.01]">
        {[...Array(rows)].map((_, r) => (
          <div key={`row-${r}`} className="p-4 flex items-center">
            {[...Array(columns)].map((_, c) => (
              <Skeleton key={`cell-${r}-${c}`} className="h-3.5 flex-1 mx-2 first:ml-0 last:mr-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Banner Skeleton */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col md:flex-row items-center gap-6">
        <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="space-y-2 flex-1 w-full">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

export function FriendGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex space-x-3 mb-6">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
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
