// ============================================================
// File:        GovernorDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/GovernorDiagHUD.jsx
// Project:     RaceArena
// Description: Pre-OUTCOME Field Governor diagnostics overlay for the DevPanel.
//              Shows, live: (1) the RESOLVED phase binding — "active (PULK) — fades
//              pulkEnd XX% → corrStart XX%" — so the owner SEES the fade window follow a
//              corridorStart edit; (2) the Action (drama) value and resolved k/A; and (3)
//              for the current LEADER and a trailing STRAGGLER, the gap-to-median, the
//              cohesion vs shuffle contribution, and the applied governorMult — so both
//              halves (brake-leader AND lift-straggler) are visible.
//              Passive DOM sibling of the race canvas (like RubberBandDiagHUD): renders
//              nothing when its toggle is off, never touches the render loop. Reuses the
//              governor's exported pure helpers + computeMedianT (single source — the HUD
//              recomputes the breakdown rather than the governor exposing internals).
//              Placement: TOP-CENTER (the bottom-center slot holds the RubberBand HUD).
// ============================================================

import { computeMedianT } from '../../modules/raceRubberBand.js';
import {
  governorDramaToKA,
  governorShufflePhase,
  governorPhaseWeight,
} from '../../modules/raceGovernor.js';

const PANEL_STYLE = {
  position: 'absolute',
  top: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(10,10,20,0.82)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '9px',
  lineHeight: '1.35',
  padding: '4px 9px',
  borderRadius: '5px',
  border: '1px solid rgba(120,255,120,0.55)',
  pointerEvents: 'none',
  zIndex: 20,
  whiteSpace: 'nowrap',
  textAlign: 'center',
};

const SEP_STYLE = {
  color: '#555',
  marginTop: '3px',
  paddingTop: '2px',
  borderTop: '1px solid rgba(120,255,120,0.25)',
};

const ON_COLOR = '#7dff7d';
const OFF_COLOR = '#888';
const CFG_COLOR = '#bfe0bf';
const BRAKE_COLOR = '#ff9a3c';
const LIFT_COLOR = '#6fd0ff';

const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const f4 = (v) => (v == null ? '—' : v.toFixed(4));

/**
 * Build the plain view snapshot from the live race state + the governor diag snapshot.
 * Pure (no refs). Recomputes the leader/straggler cohesion/shuffle breakdown from the
 * SAME exported helpers the governor uses, so the readout matches the physics exactly.
 */
function buildView(diag, state) {
  const cfg = diag.cfg;
  const racers = state.racers ?? [];
  const finishT = state.finishT ?? diag.finishT ?? 0;
  const activePhase =
    diag.phase === 'PRE_PULK' || diag.phase === 'PULK' || diag.phase === 'TRANSITION';

  const { k, A } = governorDramaToKA(cfg.drama, cfg);
  const w = activePhase
    ? governorPhaseWeight(diag.progress, diag.pulkEndFrac, diag.corrStartFrac)
    : 0;
  const gapRef = cfg.gapRef > 0 ? cfg.gapRef : 0.03;
  const f = cfg.frequency ?? 3;

  // Leader (max t) and straggler (min t) among live racers.
  let leader = null;
  let straggler = null;
  for (const r of racers) {
    if (r.finished) continue;
    if (!leader || r.t > leader.t) leader = r;
    if (!straggler || r.t < straggler.t) straggler = r;
  }
  const medianT = computeMedianT(racers);

  const breakdown = (r) => {
    if (!r || medianT === null || finishT <= 0) return null;
    const gap = (r.t - medianT) / finishT;
    const cohesion = -k * Math.max(-1, Math.min(1, gap / gapRef));
    const shuffle =
      A * Math.sin(2 * Math.PI * f * diag.progress + governorShufflePhase(r.index, diag.seed));
    return {
      name: r.name ?? r.id ?? `#${r.index}`,
      gap,
      cohesion: w * cohesion,
      shuffle: w * shuffle,
      mult: r.governorMult ?? 1.0,
    };
  };

  return {
    enabled: !!cfg.enabled,
    phase: diag.phase,
    activePhase,
    w,
    k,
    A,
    drama: cfg.drama,
    pulkEndFrac: diag.pulkEndFrac,
    corrStartFrac: diag.corrStartFrac,
    leader: breakdown(leader),
    straggler: breakdown(straggler),
  };
}

function racerLine(label, b, color) {
  if (!b) return null;
  return (
    <div>
      {label} <span style={{ color: '#ffd700' }}>{b.name}</span>
      {'  gap '}
      <span style={{ color: b.gap > 0 ? BRAKE_COLOR : LIFT_COLOR }}>
        {b.gap >= 0 ? '+' : ''}
        {pct(b.gap, 1)}
      </span>
      {'  coh '}
      <span style={{ color }}>{f4(b.cohesion)}</span>
      {'  shf '}
      <span style={{ color }}>{f4(b.shuffle)}</span>
      {'  mult '}
      <span style={{ color: b.mult < 1 ? BRAKE_COLOR : b.mult > 1 ? LIFT_COLOR : OFF_COLOR }}>
        {b.mult.toFixed(3)}
      </span>
    </div>
  );
}

/**
 * @param {{ racersRef: React.MutableRefObject, governorDiagRef: React.MutableRefObject, visible: boolean }} props
 */
export default function GovernorDiagHUD({ racersRef, governorDiagRef, visible }) {
  if (!visible) return null;

  // eslint-disable-next-line react-hooks/refs
  const diag = governorDiagRef?.current;
  // eslint-disable-next-line react-hooks/refs
  const state = racersRef?.current;
  // eslint-disable-next-line react-hooks/refs
  if (!diag?.cfg || !state) return null;

  const v = buildView(diag, state);

  return (
    <div style={PANEL_STYLE} data-testid="governor-diag-hud">
      <div style={{ marginBottom: '2px', letterSpacing: '0.05em' }}>
        <span style={{ color: '#7dff7d', fontWeight: 700 }}>GOVERNOR DIAG</span>
      </div>
      <div>
        {v.activePhase ? (
          <>
            <span style={{ color: ON_COLOR }}>active ({v.phase})</span>
            <span style={{ color: CFG_COLOR }}>
              {'  '}fades pulkEnd {pct(v.pulkEndFrac)} → corrStart {pct(v.corrStartFrac)}
              {'  '}w={v.w.toFixed(2)}
            </span>
          </>
        ) : (
          <span style={{ color: OFF_COLOR }}>off ({v.phase}) — controller owns OUTCOME</span>
        )}
      </div>
      <div style={{ color: CFG_COLOR }}>
        Action {pct(v.drama)}
        {'  '}k={f4(v.k)} A={f4(v.A)}
      </div>
      <div style={SEP_STYLE}>── field (cohesion + shuffle) ──</div>
      {racerLine('Leader:', v.leader, BRAKE_COLOR)}
      {racerLine('Straggler:', v.straggler, LIFT_COLOR)}
    </div>
  );
}
