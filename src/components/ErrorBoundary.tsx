import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global error boundary that catches uncaught render errors
 * and displays a premium fallback UI instead of a white screen.
 *
 * Errors are logged to console only in development mode.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[FocusForge ErrorBoundary]', error, errorInfo.componentStack);
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050508',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: '#f1f0ff',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            {/* Logo */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)',
                margin: '0 auto 24px',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>

            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                color: '#9d9db4',
                fontSize: '14px',
                lineHeight: 1.6,
                marginBottom: '32px',
              }}
            >
              FocusForge encountered an unexpected error. Your data is safe —
              please reload to continue.
            </p>

            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                padding: '12px 32px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.2s ease',
              }}
            >
              Reload FocusForge
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
