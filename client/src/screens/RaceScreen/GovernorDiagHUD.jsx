// ============================================================
// File:        GovernorDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/GovernorDiagHUD.jsx
// Project:     RaceArena
// Description: Director diagnostics overlay for the DevPanel (classic director OR PulkRaceDirector).
//              Shows, live: (1) the RESOLVED phase + progress in EVERY phase (incl. OUTCOME), plus the
//              director-active state + fade window (w) while active; (2) leader→2nd gap + field spread
//              in racer-lengths; and (3) the FRONT GROUP — the front ~6 live racers, each with gap to
//              the leader (racer-lengths), the baseSpeed re-roll DRAW (spreadFactor, read-only), the
//              applied governorMult (brake < 1 / boost > 1), and hero status + ROLE (sovereign-lead /
//              comebacker / faller) — so a braked leader with a high draw reads as "brake applied but
//              draw high", and a sovereign-lead hero leader reads as unbrakeable rather than a bug.
//              Passive DOM sibling of the race canvas: renders
//              nothing when its toggle is off, never touches the render loop. Reuses the director's
//              exported pure helpers (arcT, phase-weight fade). Placement: TOP-CENTER.
// ============================================================

import { arcT, governorPhaseWeight } from '../../modules/raceGovernor.js';
import { lenScaleFrom } from '../../modules/raceLengths.js';

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

// How many front racers to list (leader + the next few).
const FRONT_COUNT = 6;
// Short role labels + colours (roles the generator produces: sovereign-lead / comebacker / faller).
const ROLE_STYLE = {
  'sovereign-lead': { label: 'sovereign-lead', color: '#ff6ec7' }, // unbrakeable front hero
  comebacker: { label: 'comebacker', color: LIFT_COLOR },
  faller: { label: 'faller', color: BRAKE_COLOR },
};

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
  const lenScale = lenScaleFrom(pathLengthPx, meanBodyLen); // arc-fraction → racer-lengths (shared)
  const heroRoles = diag.heroRoles ?? null; // index → role (null until heroes cast)
  // Active-phase check MIRRORS applyGovernor: pulkOnly (PulkRaceDirector) is active only in PULK; the
  // classic director is active PRE_PULK|PULK|TRANSITION. Outside that the director contributes 1.0.
  const activePhase = cfg.pulkOnly
    ? diag.phase === 'PULK'
    : diag.phase === 'PRE_PULK' || diag.phase === 'PULK' || diag.phase === 'TRANSITION';

  const w = activePhase
    ? governorPhaseWeight(diag.progress, diag.pulkEndFrac, diag.corrStartFrac)
    : 0;

  const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  const nLive = live.length;
  const leader = live[0] ?? null;
  const second = live[1] ?? null;
  const arcLen = (a, b) => (leader ? arcT(a, b, isOpen) * lenScale : 0);
  const p = (frac) => (nLive ? live[Math.min(nLive - 1, Math.floor(frac * (nLive - 1)))].t : 0);

  // Front group: leader + the next few, each with gap-to-leader, the racer's current baseSpeed re-roll
  // DRAW (spreadFactor, read-only — the value that says whether it is drawing naturally fast/slow now,
  // so a braked leader with a high draw reads as "brake applied but draw high"), the APPLIED
  // governorMult, hero flag + role (a sovereign-lead hero leader reads as unbrakeable, not a bug).
  const front = live.slice(0, Math.min(FRONT_COUNT, nLive)).map((r) => ({
    name: r.name ?? r.id ?? `#${r.index}`,
    gapLen: leader ? arcLen(leader.t, r.t) : 0, // 0 for the leader; positive behind it
    draw: typeof r.spreadFactor === 'number' ? r.spreadFactor : null, // re-roll draw; null before first roll
    mult: r.governorMult ?? 1.0,
    isHero: !!r.isHeroChoreographed,
    role: heroRoles ? (heroRoles.get(r.index) ?? null) : null,
  }));

  return {
    phase: diag.phase ?? '—',
    progress: diag.progress ?? 0,
    activePhase,
    w,
    directorOn: !!cfg.directorEnabled,
    pulkOnly: !!cfg.pulkOnly,
    leader2ndLen: leader && second ? arcLen(leader.t, second.t) : 0,
    fieldLen: nLive > 1 ? arcLen(p(0.1), p(0.9)) : 0,
    pulkStartFrac: diag.pulkStartFrac,
    pulkEndFrac: diag.pulkEndFrac,
    corrStartFrac: diag.corrStartFrac,
    front,
  };
}

function frontLine(b, i) {
  const roleStyle = b.role ? ROLE_STYLE[b.role] : null;
  return (
    <div key={i}>
      <span style={{ color: i === 0 ? '#ffd700' : '#ddd' }}>
        {i === 0 ? 'P1 ' : `P${i + 1} `}
        {b.name}
      </span>
      {'  '}
      <span style={{ color: CFG_COLOR }}>{b.gapLen.toFixed(1)}len</span>
      {'  draw '}
      <span style={{ color: b.draw == null ? OFF_COLOR : b.draw < 1 ? BRAKE_COLOR : LIFT_COLOR }}>
        {b.draw == null ? '—' : b.draw.toFixed(2)}
      </span>
      {'  mult '}
      <span style={{ color: b.mult < 1 ? BRAKE_COLOR : b.mult > 1 ? LIFT_COLOR : OFF_COLOR }}>
        {b.mult.toFixed(3)}
      </span>
      {'  '}
      {b.isHero ? (
        <span style={{ color: roleStyle ? roleStyle.color : '#ffd700' }}>
          hero{roleStyle ? ` (${roleStyle.label})` : ''}
        </span>
      ) : (
        <span style={{ color: OFF_COLOR }}>pack</span>
      )}
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
      {/* Phase + progress — shown in EVERY phase (incl. OUTCOME), so the owner can always read it. */}
      <div>
        <span style={{ color: v.activePhase && v.directorOn ? ON_COLOR : OFF_COLOR }}>
          phase {v.phase} · {pct(v.progress)}
        </span>
        {v.activePhase ? (
          <span style={{ color: CFG_COLOR }}>
            {'  '}director {v.directorOn ? 'active' : 'off'}
            {'  '}window {pct(v.pulkStartFrac)}–{pct(v.pulkEndFrac)}
            {'  '}w={v.w.toFixed(2)}
          </span>
        ) : (
          <span style={{ color: OFF_COLOR }}>
            {'  '}director inactive — controller owns OUTCOME
          </span>
        )}
      </div>
      <div>
        <span style={{ color: CFG_COLOR }}>leader→2nd {v.leader2ndLen.toFixed(1)}len</span>
        {'  '}field(p10−p90) {v.fieldLen.toFixed(1)}len
      </div>
      <div style={SEP_STYLE}>── front group: gap · draw · applied mult · hero/role ──</div>
      {v.front.map((b, i) => frontLine(b, i))}
    </div>
  );
}
