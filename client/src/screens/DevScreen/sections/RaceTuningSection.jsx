// ============================================================
// File:        RaceTuningSection.jsx
// Path:        client/src/screens/DevScreen/sections/RaceTuningSection.jsx
// Project:     RaceArena
// Created:     2026-05-04
// Description: DevScreen section — composite card mounting DynamicsTuningSection
//              and BehaviorTuningSection with a shared Reset All button. In the chapter
//              layout (DEVSCREEN-CHAPTERS-1) only its `part="reset"` card is placed: the two
//              editors' parts are placed in The race by themselves.
// ============================================================

import DynamicsTuningSection from './DynamicsTuningSection.jsx';
import BehaviorTuningSection from './BehaviorTuningSection.jsx';
import { resetRaceRelevantToDefault } from './raceRelevantReset.js';
import { Ctl } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

function RaceTuningSection({ part }) {
  // "Reset All Defaults" restores all FIVE race-relevant blocks: baseSpeed + rowLayout + raceDynamics,
  // raceBehavior and autoScale. The two COSMETIC blocks (camera, frameTiming) are deliberately left
  // untouched — see raceRelevantReset.js, which also says why it writes storage directly.
  function handleReset() {
    resetRaceRelevantToDefault();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className={s.card}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Race Tuning</span>
          <span className={s.spacer} />
          <Ctl id="RaceTuningSection:handleReset">
            <button
              className={`${s.btn} ${s.btnGhost}`}
              onClick={handleReset}
              style={{ fontSize: '0.75rem' }}
            >
              Reset All Defaults
            </button>
          </Ctl>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          Fine-tune how races feel and play out. These settings control race physics — how racers
          move, how they react to each other, and how exciting or predictable the action is.
          You&rsquo;ll usually set these once during initial calibration and only revisit them if
          races feel wrong.
        </p>
      </div>
      {part !== 'reset' && (
        <>
          <DynamicsTuningSection />
          <BehaviorTuningSection />
        </>
      )}
    </div>
  );
}

export default RaceTuningSection;
