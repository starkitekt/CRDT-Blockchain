'use client';

import React from 'react';
import { Button, Tile } from '@carbon/react';
import { Warning } from '@carbon/icons-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[HoneyTRACE ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
          <Tile className="glass-panel p-spacing-xl rounded-2xl shadow-xl max-w-lg w-full text-center">
            <div className="flex justify-center mb-spacing-lg">
              <div className="p-4 bg-error/10 rounded-2xl text-error">
                <Warning size={48} />
              </div>
            </div>
            <h2 className="text-h2 mb-spacing-md">Something went wrong</h2>
            <p className="text-body text-slate-500 mb-spacing-lg">
              An unexpected error occurred in this dashboard module. Your data on the blockchain remains safe.
            </p>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-left bg-slate-100 p-spacing-md rounded-xl overflow-x-auto mb-spacing-lg text-slate-600 border border-slate-200">
                {this.state.error.message}
              </pre>
            )}
            <Button
              kind="primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Dashboard
            </Button>
          </Tile>
        </div>
      );
    }

    return this.props.children;
  }
}
