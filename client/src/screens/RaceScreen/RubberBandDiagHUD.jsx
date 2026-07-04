// ============================================================
// File:        RubberBandDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/RubberBandDiagHUD.jsx
// Project:     RaceArena
// Description: Rubber-band ("cap the lead") diagnostics overlay for the DevPanel.
//              Shows, side by side: (1) the LIVE rubber-band config actually in
//              effect this race — read from the same cfg object passed to
//              applyRubberBand, so a localStorage override is reflected (avoids the
//              stored-config trap of showing defaults while physics runs on
//              overridden values); and (2) whether the current leader is being
//              braked — braking window open?, gap vs threshold, applied brake,
//              surge-exempt? Cause (settings) + effect (leader brake) in one panel.
//              Passive DOM sibling of the race canvas (like BattleDiagHUD): renders
//              nothing when its toggle is off, never touches the render loop.
//              Leader + median match applyRubberBand exactly (raceRubberBand.js:
//              86-88 leader, 40-48/100-102 gap); computeMedianT is reused (single
//              source — no re-implementation).
// ============================================================

import { computeMedianT } from '../../modules/raceRubberBand.js';

const PANEL_STYLE = {
  position: 'absolute',
  bottom: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(10,10,20,0.82)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '9px',
  lineHeight: '1.35',
  padding: '4px 9px',
  borderRadius: '5px',
  border: '1px solid rgba(0,180,255,0.6)',
  pointerEvents: 'none',
  zIndex: 20,
  whiteSpace: 'nowrap',
  textAlign: 'center',
};

const SEP_STYLE = {
  color: '#555',
  marginTop: '3px',
  paddingTop: '2px',
  borderTop: '1px solid rgba(0,180,255,0.25)',
};

const ON_COLOR = '#4cff91';
const OFF_COLOR = '#ff6a6a';
const DIM = '#888';
const CFG_COLOR = '#a0e0ff';

const pct = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`;

/**
 * Build the plain view snapshot from the live race state + the exact rubber-band
 * cfg/exempt objects handed to applyRubberBand. Pure function (no refs) — invoked
 * once per render so downstream JSX reads only plain values.
 *
 * @param {{ cfg: object, surgeExemptStrength: number }} diag
 * @param {{ racers: Array, finishT: number }} state
 */
function buildView(diag, state) {
  const cfg = diag.cfg;
  const surgeExempt = diag.surgeExemptStrength ?? 0;
  const racers = state.racers ?? [];
  const finishT = state.finishT ?? 0;

  // Leader = unfinished racer with max cumulative t (same metric as applyRubberBand).
  let leader = null;
  for (const r of racers) {
    if (r.finished) continue;
    if (!leader || r.t > leader.t) leader = r;
  }

  const leaderProgress = leader && finishT > 0 ? leader.t / finishT : 0;
  const windowOpen = !!leader && leader.t > 0 && leaderProgress < cfg.rubberBandEndgameThreshold;

  // Gap to field median (single source: computeMedianT). Null when no live racers.
  const medianT = computeMedianT(racers);
  const gap = leader && medianT !== null && finishT > 0 ? (leader.t - medianT) / finishT : 0;
  const overThreshold = gap > cfg.brakeThreshold;

  const rbMult = leader?.rubberBandMult ?? 1.0;

  return {
    cfg,
    surgeExempt,
    leaderName: leader?.name ?? leader?.id ?? '—',
    leaderProgress,
    windowOpen,
    gap,
    overThreshold,
    braking: rbMult < 0.999,
    brakePct: (1 - rbMult) * 100,
    leaderSurging: (leader?.pulkSurgeMult ?? 1.0) > 1.0001,
  };
}

/**
 * @param {{ racersRef: React.MutableRefObject, rubberBandDiagRef: React.MutableRefObject, visible: boolean }} props
 *   racersRef         — ref whose .current holds { racers, finishT } (the live race state, g)
 *   rubberBandDiagRef — ref whose .current holds { cfg, surgeExemptStrength } — the exact
 *                       objects handed to applyRubberBand this race
 *   visible           — toggle (already ANDed with "no center overlay banner" by the caller)
 */
export default function RubberBandDiagHUD({ racersRef, rubberBandDiagRef, visible }) {
  if (!visible) return null;

  // eslint-disable-next-line react-hooks/refs
  const diag = rubberBandDiagRef?.current;
  // eslint-disable-next-line react-hooks/refs
  const state = racersRef?.current;
  // eslint-disable-next-line react-hooks/refs
  if (!diag?.cfg || !state) return null;

  const v = buildView(diag, state);
  const { cfg } = v;

  return (
    <div style={PANEL_STYLE} data-testid="rubber-band-diag-hud">
      <div style={{ marginBottom: '2px', letterSpacing: '0.05em' }}>
        <span style={{ color: '#00b4ff', fontWeight: 700 }}>RUBBER-BAND DIAG</span>
      </div>
      <div>
        cfg:{' '}
        <span style={{ color: cfg.enabled ? ON_COLOR : OFF_COLOR }}>
          {cfg.enabled ? 'on' : 'off'}
        </span>
        <span style={{ color: CFG_COLOR }}>
          {'  '}thr {pct(cfg.brakeThreshold)}
          {'  '}gap {pct(cfg.gapScale)}
          {'  '}max -{pct(cfg.maxBrake, 0)}
          {'  '}ramp {(cfg.boostRampMs / 1000).toFixed(1)}s{'  '}release{' '}
          {pct(cfg.rubberBandEndgameThreshold, 0)}
          {'  '}exempt x{v.surgeExempt.toFixed(1)}
        </span>
      </div>

      <div style={SEP_STYLE}>── leader ──</div>
      <div>
        <span style={{ color: '#ffd700' }}>{v.leaderName}</span>
        {'  ·  '}prog {pct(v.leaderProgress, 0)} (release {pct(cfg.rubberBandEndgameThreshold, 0)})
        {'  ·  '}window{' '}
        <span style={{ color: v.windowOpen ? ON_COLOR : OFF_COLOR }}>
          {v.windowOpen ? 'ON' : 'OFF'}
        </span>
      </div>
      <div>
        gap <span style={{ color: v.overThreshold ? ON_COLOR : DIM }}>+{pct(v.gap)}</span>
        {'   '}thr +{pct(cfg.brakeThreshold)}
        {'   '}
        <span style={{ color: v.overThreshold ? ON_COLOR : DIM }}>
          ({v.overThreshold ? 'over' : 'under'})
        </span>
      </div>
      <div>
        brake{' '}
        <span style={{ color: v.braking ? ON_COLOR : DIM }}>
          {v.braking ? `-${v.brakePct.toFixed(0)}%` : 'none'}
        </span>
        {v.leaderSurging && <span style={{ color: '#ff9a3c' }}>{'  '}(surge-exempt)</span>}
      </div>
    </div>
  );
}
