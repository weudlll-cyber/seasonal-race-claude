// ============================================================
// File:        GovernorDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/GovernorDiagHUD.jsx
// Project:     RaceArena
// Description: Pre-OUTCOME Field Governor diagnostics overlay for the DevPanel.
//              Shows, live: (1) the RESOLVED phase binding — "active (PULK) — fades
//              pulkEnd XX% → corrStart XX%" — so the owner SEES the fade window follow a
//              corridorStart edit; (2) the Action (drama) value and resolved k/A; and (3)
//              for the current LEADER and a trailing STRAGGLER, the gap-to-median, the
//              cohesion vs shuffle contribution, and the applied governorMult — so the
//              tail-lift on the straggler is visible AND the leader confirms the governor
//              never brakes it (cohesion stays 0 at or ahead of the median, Stage C).
//              Passive DOM sibling of the race canvas: renders nothing when its toggle is
//              off, never touches the render loop. Reuses the governor's exported pure
//              helpers + computeMedianT (single source — the HUD recomputes the breakdown
//              rather than the governor exposing internals). Placement: TOP-CENTER.
// ============================================================

import {
  arcT,
  computeMedianT,
  governorActionToParams,
  governorRestoringForce,
  governorShufflePhase,
  governorPhaseWeight,
  governorFadeStart,
  directorFeaturedSet,
} from '../../modules/raceGovernor.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
const DIRECTOR_COLOR = '#ffd166';

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
  const isOpen = diag.isOpen ?? false;
  const pathLengthPx = diag.pathLengthPx ?? 0;
  const meanBodyLen = diag.meanBodyLen ?? 0;
  const lenScale = meanBodyLen > 0 ? pathLengthPx / meanBodyLen : 0; // arc-fraction → racer-lengths
  const activePhase =
    diag.phase === 'PRE_PULK' || diag.phase === 'PULK' || diag.phase === 'TRANSITION';

  const { lengths: boundLengths, A } = governorActionToParams(cfg.drama, cfg);
  const w = activePhase
    ? governorPhaseWeight(diag.progress, diag.pulkEndFrac, diag.corrStartFrac)
    : 0;
  const k0 = cfg.k0 ?? 0.03;
  const maxEffect = cfg.maxEffect ?? 0.12;
  const rampWidth = cfg.rampWidth > 0 ? cfg.rampWidth : 0.5;
  const f = cfg.frequency ?? 3;

  // Director (contest-injector) featured cast for this step — recomputed from the SAME exported
  // helper the physics uses (single source), so the readout matches who is actually featured.
  const directorOn = !!cfg.directorEnabled;
  const anchorOffset = cfg.directorAnchorOffset ?? 2.0;
  const pullStrength = cfg.directorPullStrength ?? 0.06;
  const directorCutoff =
    governorFadeStart(diag.pulkEndFrac, diag.corrStartFrac) - (cfg.directorSettling ?? 0.05);
  const featured =
    directorOn && activePhase && lenScale > 0
      ? directorFeaturedSet(
          racers,
          diag.seed,
          diag.progress,
          cfg.directorCastSize ?? 3,
          cfg.directorDwell ?? 0.08,
          directorCutoff
        )
      : null;

  // Leader (max t), 2nd, straggler (min t), field-length p90−p10 among live racers.
  const live = racers.filter((r) => !r.finished).sort((a, b) => b.t - a.t);
  const nLive = live.length;
  const leader = live[0] ?? null;
  const second = live[1] ?? null;
  const straggler = live[nLive - 1] ?? null;
  const medianT = computeMedianT(racers);

  // Arc-distance in TRUE RACER-LENGTHS (same metric the governor regulates). Signed by the
  // cumulative-t order (ahead = +, behind = −), magnitude = visible on-track arc / body length.
  const toLengths = (a, b) => Math.sign(a - b) * arcT(a, b, isOpen) * lenScale;
  const p = (frac) => (nLive ? live[Math.min(nLive - 1, Math.floor(frac * (nLive - 1)))].t : 0);
  const fieldLen = nLive > 1 ? toLengths(p(0.1), p(0.9)) : 0;
  const leaderGapLen = leader && medianT !== null ? toLengths(leader.t, medianT) : 0;
  const leader2ndLen = leader && second ? toLengths(leader.t, second.t) : 0;

  const breakdown = (r) => {
    if (!r || medianT === null || lenScale <= 0) return null;
    const gapLengths = toLengths(r.t, medianT);
    const x = boundLengths > 0 ? gapLengths / boundLengths : 0;
    // TAIL-LIFT ONLY (parity with applyGovernor): lift only racers past the bound BEHIND the
    // median (x < −1); everyone at or ahead of the median gets exactly 0 — no leader-brake.
    const behindExcess = x < -1 ? -x - 1 : 0;
    const lifted = behindExcess > 0;
    const cohesion =
      cfg.enabled && lifted ? governorRestoringForce(behindExcess / rampWidth, k0, maxEffect) : 0;
    const shuffle = cfg.enabled
      ? A * Math.sin(2 * Math.PI * f * diag.progress + governorShufflePhase(r.index, diag.seed))
      : 0;
    // Director pull toward the front anchor (median + offset) — only for a featured racer.
    const isFeatured = !!(featured && featured.has(r.index));
    const director = isFeatured
      ? clamp(-pullStrength * (gapLengths - anchorOffset), -maxEffect, maxEffect)
      : 0;
    return {
      name: r.name ?? r.id ?? `#${r.index}`,
      gapLen: gapLengths,
      lifted,
      featured: isFeatured,
      cohesion: w * cohesion,
      shuffle: w * shuffle,
      director: w * director,
      mult: r.governorMult ?? 1.0,
    };
  };

  // Featured-cast names (for the director readout) — order by current t so the eye can map them.
  const featuredNames = featured
    ? live.filter((r) => featured.has(r.index)).map((r) => r.name ?? r.id ?? `#${r.index}`)
    : [];

  return {
    enabled: !!cfg.enabled,
    phase: diag.phase,
    activePhase,
    w,
    A,
    drama: cfg.drama,
    boundLengths,
    leaderGapLen,
    leader2ndLen,
    fieldLen,
    pulkEndFrac: diag.pulkEndFrac,
    corrStartFrac: diag.corrStartFrac,
    directorOn,
    anchorOffset,
    directorCutoff,
    featuredNames,
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
      <span style={{ color: b.gapLen < 0 ? LIFT_COLOR : CFG_COLOR }}>
        {b.gapLen >= 0 ? '+' : ''}
        {b.gapLen.toFixed(1)}len
      </span>
      {'  '}
      <span style={{ color: b.featured ? DIRECTOR_COLOR : b.lifted ? LIFT_COLOR : ON_COLOR }}>
        {b.featured ? 'feat' : b.lifted ? 'lift' : 'free'}
      </span>
      {'  coh '}
      <span style={{ color }}>{f4(b.cohesion)}</span>
      {'  shf '}
      <span style={{ color }}>{f4(b.shuffle)}</span>
      {'  dir '}
      <span style={{ color: DIRECTOR_COLOR }}>{f4(b.director)}</span>
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
        {'  '}bound {v.boundLengths.toFixed(1)}len
        {'  '}A={f4(v.A)}
      </div>
      <div>
        {/* Neutral measurements — the governor no longer acts on the leader; these feed the
            later tip-leash layer + the sweep. */}
        <span style={{ color: CFG_COLOR }}>leader→median {v.leaderGapLen.toFixed(1)}len</span>
        {'  '}leader→2nd {v.leader2ndLen.toFixed(1)}len
        {'  '}field(p10−p90) {v.fieldLen.toFixed(1)}len
      </div>
      <div style={{ color: v.directorOn ? DIRECTOR_COLOR : OFF_COLOR }}>
        director {v.directorOn ? 'ON' : 'off'}
        {v.directorOn && (
          <>
            {'  anchor +'}
            {v.anchorOffset.toFixed(1)}len{'  stops '}
            {pct(v.directorCutoff)}
            {'  cast '}
            {v.activePhase && v.featuredNames.length
              ? `[${v.featuredNames.join(', ')}]`
              : v.activePhase
                ? '(settling)'
                : '—'}
          </>
        )}
      </div>
      <div style={SEP_STYLE}>── field (coh + shuffle + director) ──</div>
      {racerLine('Leader:', v.leader, CFG_COLOR)}
      {racerLine('Straggler:', v.straggler, LIFT_COLOR)}
    </div>
  );
}
