import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ============================================================
// PageErrorBoundary — Page-level error boundary
// ============================================================
// Catches render errors within individual lazy-loaded pages.
// Unlike the global ErrorBoundary (which catches app-level crashes),
// this boundary isolates page failures so the shell (sidebar,
// header, navigation) remains functional.
//
// Features:
// - "Retry" button resets error state and re-renders the page
// - "Go to Dashboard" navigates away from the broken page
// - Never exposes stack traces in production
// - Uses existing design system styling
// ============================================================

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  /** Called when "Go to Dashboard" is clicked */
  onNavigateHome?: () => void;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class PageErrorBoundary extends React.Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: import.meta.env.DEV
        ? error.message
        : 'This page encountered an unexpected error.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[PageErrorBoundary]', error, errorInfo.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleNavigateHome = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onNavigateHome?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center p-8 text-center space-y-5"
          style={{ minHeight: '400px' }}
        >
          {/* Icon */}
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <AlertTriangle size={28} style={{ color: '#ef4444' }} />
          </div>

          {/* Title */}
          <div className="space-y-1 max-w-md">
            <h3
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Something went wrong
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {this.state.errorMessage}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'var(--accent-gradient)',
                color: 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} />
              Retry
            </button>
            {this.props.onNavigateHome && (
              <button
                onClick={this.handleNavigateHome}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'var(--bg-card-hover)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                  cursor: 'pointer',
                }}
              >
                <Home size={15} />
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
