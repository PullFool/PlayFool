import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PlayFool error:', error, errorInfo);
    // Silently report to backend
    const API_BASE = process.env.REACT_APP_API_URL || '/api';
    try {
      fetch(`${API_BASE}/report-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'react.ErrorBoundary',
          message: error?.message || String(error),
          stack: (error?.stack || '') + '\n\nComponent stack:' + (errorInfo?.componentStack || ''),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch(e) { /* silent */ }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh',
          background: '#121212', color: '#fff', fontFamily: 'Inter, sans-serif',
        }}>
          <h1 style={{ color: '#1DB954', marginBottom: 16 }}>Something went wrong</h1>
          <p style={{ color: '#b3b3b3', marginBottom: 24 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              background: '#1DB954', color: '#000', border: 'none',
              borderRadius: 20, padding: '10px 24px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
