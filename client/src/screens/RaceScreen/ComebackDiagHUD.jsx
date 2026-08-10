// ============================================================
// File:        ComebackDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/ComebackDiagHUD.jsx
// Project:     RaceArena
// Description: COMEBACK diagnostics overlay for the DevPanel.
//              Shows: OUTCOME-phase status, B1 racers with current rank and
//              positions-gained within the comeback window, and which racer
//              the camera is currently locked on.
//              Rendered on top of the race canvas when showComebackDiag is enabled.
// ============================================================

const PANEL_STYLE = {
  position: 'absolute',
  bottom: '80px',
  right: '8px',
  background: 'rgba(10,10,20,0.82)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '11px',
  lineHeight: '1.5',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(0,200,120,0.6)',
  pointerEvents: 'none',
  zIndex: 20,
  minWidth: '220px',
};

const LABEL_ACTIVE = { color: '#00c878', fontWeight: 700 };
const LABEL_INACTIVE = { color: '#888' };
const LOCKED_COLOR = '#ffd700';
const QUALIFY_COLOR = '#00c878';
const NO_QUALIFY_COLOR = '#888';

/**
 * @param {{ cameraRef: React.MutableRefObject, racersRef: React.MutableRefObject, visible: boolean }} props
 */
export default function ComebackDiagHUD({ cameraRef, racersRef, visible }) {
  if (!visible) return null;

  // eslint-disable-next-line react-hooks/refs
  const dir = cameraRef?.current;
  // eslint-disable-next-line react-hooks/refs
  if (!dir) return null;

  // eslint-disable-next-line react-hooks/refs
  const racers = racersRef?.current?.racers ?? [];
  // eslint-disable-next-line react-hooks/purity
  const ts = performance.now();
  // eslint-disable-next-line react-hooks/refs
  const diag = dir.getComebackDiagData(racers, ts);

  const lockedName = diag.lockedRacer?.name ?? diag.lockedRacer?.id ?? '—';
  const hasB1Data = diag.b1Data && diag.b1Data.length > 0;

  return (
    <div style={PANEL_STYLE} data-testid="comeback-diag-hud">
      <div style={{ marginBottom: '2px', letterSpacing: '0.05em' }}>
        <span style={{ color: '#00c878', fontWeight: 700 }}>COMEBACK DIAG</span>
      </div>
      <div>
        Status:{' '}
        <span style={diag.active ? LABEL_ACTIVE : LABEL_INACTIVE}>
          {diag.active ? 'ACTIVE' : 'idle'}
        </span>
      </div>
      <div>
        Cam locked:{' '}
        <span style={{ color: LOCKED_COLOR }}>{diag.lockedRacer ? lockedName : '—'}</span>
      </div>
      <div>
        Phase gate:{' '}
        <span style={diag.isOutcomePhaseActive ? LABEL_ACTIVE : LABEL_INACTIVE}>
          {diag.isOutcomePhaseActive ? '✓ open' : '✗ closed'}
        </span>{' '}
        <span style={{ color: '#666' }}>
          ({(diag.leaderProgress ?? 0).toFixed(2)} /{' '}
          {/* OUTCOME-PHASE-75: the threshold is shown ONLY when the director actually has one.
              This used to be `?? 0.75`, a literal copy of a default that has since moved — so the
              panel would have stated a number the camera was not running and looked authoritative
              doing it. A dash is the honest reading of "the director has not computed one". */}
          {Number.isFinite(diag.outcomePhaseThreshold)
            ? diag.outcomePhaseThreshold.toFixed(2)
            : '—'}
          )
        </span>
      </div>
      <div
        style={{
          color: '#555',
          marginTop: '3px',
          borderTop: '1px solid rgba(0,200,120,0.2)',
          paddingTop: '3px',
        }}
      >
        <span style={{ color: '#aaa' }}>B1 Racers</span>{' '}
        <span style={{ color: '#555' }}>
          (window {diag.windowSec}s · min +{diag.minPositionsGained})
        </span>
      </div>
      {hasB1Data ? (
        diag.b1Data.map((entry) => {
          const allOk = entry.gainOk && entry.startGapOk && entry.currentRankOk;
          const failures = [];
          if (!entry.gainOk) failures.push('gain✗');
          if (!entry.startGapOk) failures.push('gap✗');
          if (!entry.currentRankOk) failures.push('rank✗');
          return (
            <div key={entry.index} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
              <span
                style={{
                  color: allOk ? QUALIFY_COLOR : NO_QUALIFY_COLOR,
                  fontWeight: allOk ? 700 : 400,
                  minWidth: '8px',
                }}
              >
                {allOk ? '✓' : failures.join(' ')}
              </span>
              <span
                style={{
                  color: '#ddd',
                  minWidth: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '80px',
                }}
              >
                {entry.name}
              </span>
              <span style={{ color: '#aaa' }}>#{entry.currentRank ?? '?'}</span>
              {entry.rankAtWindowStart != null && (
                <span style={{ color: entry.positionsGained > 0 ? QUALIFY_COLOR : '#666' }}>
                  (+{entry.positionsGained} from #{entry.rankAtWindowStart})
                </span>
              )}
            </div>
          );
        })
      ) : (
        <div style={{ color: '#555' }}>no B1 data (race plan off?)</div>
      )}
    </div>
  );
}
