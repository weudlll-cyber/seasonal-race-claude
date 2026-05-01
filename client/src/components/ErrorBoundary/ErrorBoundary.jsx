// ============================================================
// File:        ErrorBoundary.jsx
// Path:        client/src/components/ErrorBoundary/ErrorBoundary.jsx
// Project:     RaceArena
// Created:     2026-05-01
// Description: Top-level React Error Boundary — catches render-time throws
//              and shows a recovery UI instead of a blank screen.
// ============================================================

import { Component } from 'react';

const RACEARENA_PREFIX = 'racearena:';

function clearRaceArenaStorage() {
  [localStorage, sessionStorage].forEach((store) => {
    const keysToRemove = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && key.startsWith(RACEARENA_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => store.removeItem(key));
  });
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
    this.handleReload = this.handleReload.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleToggleDetails = this.handleToggleDetails.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[RaceArena] Render crash:', error);
    console.error('[RaceArena] Component stack:', errorInfo.componentStack);
  }

  handleReload() {
    window.location.reload();
  }

  handleReset() {
    const confirmed = window.confirm(
      'This will delete all local race data including custom tracks, racer settings, and tunings. Server data is not affected. Continue?'
    );
    if (!confirmed) return;
    clearRaceArenaStorage();
    window.location.reload();
  }

  handleToggleDetails() {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo, showDetails } = this.state;
    const message = error?.message || String(error) || 'Unknown error';
    const stack = errorInfo?.componentStack ?? '';

    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.body}>
            An unexpected error occurred. Please reload the page to try again.
          </p>

          <div style={styles.actions}>
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={this.handleReload}>
              Reload page
            </button>
            <button style={{ ...styles.btn, ...styles.btnDestructive }} onClick={this.handleReset}>
              Reset local data
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={this.handleToggleDetails}
            >
              {showDetails ? 'Hide technical details' : 'Show technical details'}
            </button>
          </div>

          {showDetails && (
            <pre style={styles.details} data-testid="error-details">
              {message}
              {stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

const styles = {
  overlay: {
    minHeight: '100vh',
    background: '#0d0d0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: '#1a1a22',
    borderRadius: '8px',
    padding: '2rem 2.5rem',
    maxWidth: '560px',
    width: '100%',
    color: '#eaeaea',
  },
  heading: {
    fontSize: '1.4rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    color: '#eaeaea',
  },
  body: {
    fontSize: '0.95rem',
    color: '#888',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  btn: {
    padding: '0.55rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    width: '100%',
  },
  btnPrimary: {
    background: '#e63946',
    color: '#fff',
  },
  btnDestructive: {
    background: 'transparent',
    color: '#f87171',
    border: '1px solid #f87171',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #333',
  },
  details: {
    marginTop: '1.25rem',
    background: '#111',
    borderRadius: '4px',
    padding: '1rem',
    fontSize: '0.75rem',
    color: '#aaa',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
};

export default ErrorBoundary;
