/**
 * ErrorBoundary.jsx
 * Catches unexpected React render errors and shows a friendly fallback.
 */
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
          <div className="soft-card p-10 max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="font-display font-extrabold text-2xl text-primary-700 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Please refresh the page or go back to the dashboard.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="text-left bg-red-50 rounded-2xl p-4 text-xs text-red-600 mb-5 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                Refresh Page
              </button>
              <a href="/dashboard" className="btn-outline px-6 py-2.5 text-sm">
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
