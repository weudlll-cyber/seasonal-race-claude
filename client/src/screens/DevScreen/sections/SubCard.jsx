// ============================================================
// File:        SubCard.jsx
// Path:        client/src/screens/DevScreen/sections/SubCard.jsx
// Project:     RaceArena
// Created:     2026-05-25
// Description: Shared card shell for DevScreen sections — title, optional subtitle,
//              disable-fade, and reset button slot.
// ============================================================

import s from '../DevScreen.module.css';

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
