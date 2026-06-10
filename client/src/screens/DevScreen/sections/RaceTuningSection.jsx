// ============================================================
// File:        RaceTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: DevScreen section — composite card mounting DynamicsTuningSection
//              and BehaviorTuningSection with a shared Reset All button.
// ============================================================

import { useRef } from 'react';
import DynamicsTuningSection from './DynamicsTuningSection.jsx';
import BehaviorTuningSection from './BehaviorTuningSection.jsx';
import s from '../DevScreen.module.css';

function RaceTuningSection() {
  const dynamicsRef = useRef(null);
  const behaviorRef = useRef(null);

  function handleReset() {
    dynamicsRef.current?.resetAll();
    behaviorRef.current?.resetAll();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Race Tuning</span>
          <span className={s.spacer} />
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={handleReset}
            style={{ fontSize: '0.75rem' }}
          >
            Reset All Defaults
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Fine-tune how races feel and play out. These settings control race physics — how racers
          move, how they react to each other, and how exciting or predictable the action is.
          You&rsquo;ll usually set these once during initial calibration and only revisit them if
          races feel wrong.
        </p>
      </div>
      <DynamicsTuningSection ref={dynamicsRef} />
      <BehaviorTuningSection ref={behaviorRef} />
    </div>
  );
}

export default RaceTuningSection;
