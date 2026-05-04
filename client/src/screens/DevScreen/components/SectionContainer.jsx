// ============================================================
// File:        SectionContainer.jsx
// Path:        client/src/screens/DevScreen/components/SectionContainer.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: Reusable section wrapper for Dev-Panel sections.
//              Provides consistent header (icon + title + reset button) and
//              subtitle. Mirrors the BaseSpeedSection layout pattern.
// ============================================================

import s from '../DevScreen.module.css';

export function SectionContainer({ icon, title, subtitle, onReset, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: subtitle ? '0.35rem' : '0.75rem',
          }}
        >
          {icon && <span style={{ fontSize: '1.1rem' }}>{icon}</span>}
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
          <span className={s.spacer} />
          {onReset && (
            <button
              className={`${s.btn} ${s.btnGhost}`}
              onClick={onReset}
              style={{ fontSize: '0.75rem' }}
            >
              Reset Defaults
            </button>
          )}
        </div>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export default SectionContainer;
