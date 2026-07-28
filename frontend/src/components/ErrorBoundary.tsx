import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#111b21] text-white p-6">
          <div className="max-w-md w-full bg-[#202c33] border border-[#222d34] rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
              !
            </div>
            <h1 className="text-xl font-bold text-[#e9edef] mb-2">Something went wrong</h1>
            <p className="text-sm text-[#8696a0] mb-6 leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred while loading the application session.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-semibold rounded-xl transition"
            >
              Reload Quick Chat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
