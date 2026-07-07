// ============================================================
// File:        GovernorDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/GovernorDiagHUD.jsx
// Project:     RaceArena
// Description: Pre-OUTCOME contest-injector "director" diagnostics overlay for the DevPanel.
//              Shows, live: (1) the RESOLVED phase binding — "active (PULK) — fades pulkEnd XX%
//              → corrStart XX%, w=…" — so the owner SEES the fade window follow a corridorStart
//              edit; (2) the director state (leader→2nd gap + field spread, in racer-lengths); and
//              (3) for the current LEADER and a trailing STRAGGLER, the gap to the leader and the
//              applied governorMult (brake < 1 / boost > 1). Passive DOM sibling of the race
//              canvas: renders nothing when its toggle is off, never touches the render loop.
//              Reuses the director's exported pure helpers (arcT, phase-weight fade). The director
//              no longer uses the field median, so no median is read here. Placement: TOP-CENTER.
// ============================================================

import { arcT, governorPhaseWeight } from '../../modules/raceGovernor.js';

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

/**
 * Build the plain view snapshot from the live race state + the director diag snapshot. Pure (no
 * refs). Reads only position + the applied governorMult, so the readout always matches the physics.
 */
function buildView(diag, state) {
  const cfg = diag.cfg;
  const racers = state.racers ?? [];
  const isOpen = diag.isOpen ?? false;
  const pathLengthPx = diag.pathLengthPx ?? 0;
  const meanBodyLen = diag.meanBodyLen ?? 0;
  const lenScale = meanBodyLen > 0 ? pathLengthPx / meanBodyLen : 0; // arc-fraction → racer-lengths
  const activePhase =
    diag.phase === 'PRE_PULK' || diag.phase === 'PULK' || diag.phase === 'TRANSITION';

  const w = activePhase
    ? governorPhaseWeight(diag.progress, diag.pulkEndFrac, diag.corrStartFrac)
    : 0;

  const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  const nLive = live.length;
  const leader = live[0] ?? null;
  const second = live[1] ?? null;
  const straggler = live[nLive - 1] ?? null;
  const arcLen = (a, b) => (leader ? arcT(a, b, isOpen) * lenScale : 0);
  const p = (frac) => (nLive ? live[Math.min(nLive - 1, Math.floor(frac * (nLive - 1)))].t : 0);

  const line = (r) =>
    r
      ? {
          name: r.name ?? r.id ?? `#${r.index}`,
          gapLen: leader ? arcLen(leader.t, r.t) : 0, // 0 for the leader; positive behind it
          mult: r.governorMult ?? 1.0,
        }
      : null;

  return {
    phase: diag.phase,
    activePhase,
    w,
    directorOn: !!cfg.directorEnabled,
    leader2ndLen: leader && second ? arcLen(leader.t, second.t) : 0,
    fieldLen: nLive > 1 ? arcLen(p(0.1), p(0.9)) : 0,
    pulkEndFrac: diag.pulkEndFrac,
    corrStartFrac: diag.corrStartFrac,
    leader: line(leader),
    straggler: line(straggler),
  };
}

function racerLine(label, b) {
  if (!b) return null;
  return (
    <div>
      {label} <span style={{ color: '#ffd700' }}>{b.name}</span>
      {'  behind '}
      <span style={{ color: CFG_COLOR }}>{b.gapLen.toFixed(1)}len</span>
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
        <span style={{ color: '#7dff7d', fontWeight: 700 }}>DIRECTOR DIAG</span>
      </div>
      <div>
        {v.activePhase ? (
          <>
            <span style={{ color: v.directorOn ? ON_COLOR : OFF_COLOR }}>
              {v.directorOn ? 'active' : 'off'} ({v.phase})
            </span>
            <span style={{ color: CFG_COLOR }}>
              {'  '}fades pulkEnd {pct(v.pulkEndFrac)} → corrStart {pct(v.corrStartFrac)}
              {'  '}w={v.w.toFixed(2)}
            </span>
          </>
        ) : (
          <span style={{ color: OFF_COLOR }}>off ({v.phase}) — controller owns OUTCOME</span>
        )}
      </div>
      <div>
        <span style={{ color: CFG_COLOR }}>leader→2nd {v.leader2ndLen.toFixed(1)}len</span>
        {'  '}field(p10−p90) {v.fieldLen.toFixed(1)}len
      </div>
      <div style={SEP_STYLE}>── gap behind leader + applied mult ──</div>
      {racerLine('Leader:', v.leader)}
      {racerLine('Straggler:', v.straggler)}
    </div>
  );
}
