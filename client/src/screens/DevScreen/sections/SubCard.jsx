// ============================================================
// File:        SubCard.jsx
// Path:        client/src/screens/DevScreen/sections/SubCard.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: Shared card shell for DevScreen sections — title, optional subtitle,
//              disable-fade, and reset button slot. SubHeading is a lightweight in-card
//              group heading (label + optional note + optional per-group Reset) used when
//              several control groups share one card.
// ============================================================

import s from '../DevScreen.module.css';

const RESET_BTN_STYLE = {
  background: 'none',
  border: 'none',
  color: 'var(--color-muted)',
  fontSize: '0.72rem',
  cursor: 'pointer',
  padding: '0.1rem 0.2rem',
  opacity: 0.7,
};

// In-card group heading: a small divided heading with an optional descriptive note and an optional
// per-group Reset. Lets one SubCard hold several labelled control groups, each independently reset.
export function SubHeading({ label, note, onReset, resetTestId }) {
  return (
    <div
      style={{
        marginTop: '1.1rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid var(--color-border, rgba(255,255,255,0.09))',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: note ? '0.2rem' : '0.6rem' }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.8rem',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: 'var(--color-muted)',
          }}
        >
          {label}
        </span>
        <span className={s.spacer} />
        {onReset && (
          <button onClick={onReset} data-testid={resetTestId} style={RESET_BTN_STYLE}>
            Reset
          </button>
        )}
      </div>
      {note && (
        <p style={{ fontSize: '0.76rem', color: 'var(--color-muted)', margin: '0 0 0.6rem' }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function SubCard({ title, subtitle, children, disabled, onReset, resetTestId }) {
  return (
    <div className={s.card} style={{ opacity: disabled ? 0.45 : 1 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: subtitle ? '0.2rem' : '0.75rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</span>
        <span className={s.spacer} />
        {onReset && (
          <button
            onClick={onReset}
            data-testid={resetTestId}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              padding: '0.1rem 0.2rem',
              opacity: 0.7,
            }}
          >
            Reset
          </button>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
