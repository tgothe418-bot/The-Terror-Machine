import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });
    console.error('// CRITICAL UI FAILURE //', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          id="critical-ui-failure-boundary"
          className="min-h-screen bg-black text-red-500 font-mono p-8 flex flex-col items-center justify-center space-y-4"
        >
          <div className="border border-red-900 bg-red-950/20 p-6 rounded max-w-2xl w-full text-center space-y-4">
            <h1 className="text-lg tracking-widest font-bold uppercase text-red-400">
              [ CRITICAL UI FAILURE ]
            </h1>
            <p className="text-xs text-zinc-400">
              {this.state.error?.message || 'An unexpected rendering exception occurred.'}
            </p>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
              Check console logs for detailed diagnostic trace
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
