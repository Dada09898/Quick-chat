import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log strictly metadata without payloads
    console.error("Uncaught runtime error:", error.name, errorInfo.componentStack);
    
    // In production, this would use telemetry.ts to batch send the stack trace securely.
  }

  handleSafeRestart = async () => {
    // Fallback recovery workflow: clear IDB caches without losing keys.
    try {
      const { clearCache } = await import('../sync/idb');
      await clearCache();
      window.location.reload();
    } catch (e) {
      window.localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
          <div className="bg-card p-8 rounded-2xl border border-red-500/30 max-w-lg w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Application Error Detected</h2>
            <p className="text-secondary mb-6">
              A critical error forced the application to halt. Your encrypted data remains completely secure. 
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
              >
                Reload Page
              </button>
              <button 
                onClick={this.handleSafeRestart}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Safe Recovery Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
