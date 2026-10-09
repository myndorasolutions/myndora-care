import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Btn } from '@/components/kit';

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Myndora demo error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
          <div className="mc-card max-w-md text-center">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-4">The demo hit an unexpected error. Your local demo data is safe.</p>
            {this.state.message && <p className="text-xs text-slate-400 mb-4 font-mono">{this.state.message}</p>}
            <Btn onClick={() => this.setState({ hasError: false, message: '' })}>Try again</Btn>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
