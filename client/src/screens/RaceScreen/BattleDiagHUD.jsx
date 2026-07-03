// ============================================================
// File:        BattleDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/BattleDiagHUD.jsx
// Project:     RaceArena
// Description: BATTLE diagnostics overlay for the DevPanel.
//              Shows: current detection status, participating racers (with live ranks),
//              whether the original entry group is still valid, the currently detected
//              group (may differ from the entry group), and which racer the camera is
//              locked on.
//              Rendered on top of the race canvas when showBattleDiag is enabled.
// ============================================================

const PANEL_STYLE = {
  position: 'absolute',
  bottom: '80px',
  left: '8px',
  background: 'rgba(10,10,20,0.82)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '9px',
  lineHeight: '1.35',
  padding: '4px 7px',
  borderRadius: '5px',
  border: '1px solid rgba(255,100,0,0.6)',
  pointerEvents: 'none',
  zIndex: 20,
  minWidth: '160px',
  maxWidth: '240px',
};

const LABEL_ACTIVE = { color: '#ff6a00', fontWeight: 700 };
const LABEL_INACTIVE = { color: '#888' };
const LOCKED_COLOR = '#ffd700';
const GROUP_COLOR = '#a0e0ff';
const VALID_COLOR = '#4cff91';
const INVALID_COLOR = '#ff4444';

/**
 * @param {{ cameraRef: React.MutableRefObject, racersRef: React.MutableRefObject, visible: boolean }} props
 *   cameraRef — ref to the CameraDirector instance
 *   racersRef  — ref to the live racers array (g.current.racers or similar)
 *   visible    — whether the toggle is on
 */
export default function BattleDiagHUD({ cameraRef, racersRef, visible }) {
  if (!visible) return null;

  // eslint-disable-next-line react-hooks/refs
  const dir = cameraRef?.current;
  // eslint-disable-next-line react-hooks/refs
  if (!dir) return null;

  // eslint-disable-next-line react-hooks/refs
  const racers = racersRef?.current?.racers ?? [];
  // eslint-disable-next-line react-hooks/refs
  const diag = dir.getBattleDiagData(racers);

  const lockedName = diag.lockedRacer?.name ?? diag.lockedRacer?.id ?? '—';

  // Entry group: show each name with its current rank e.g. "Blitz(#3)"
  const groupWithRanks = diag.groupRacers.map((r, i) => {
    const name = r?.name ?? r?.id ?? '?';
    const rank = diag.groupRacerRanks?.[i];
    return rank != null ? `${name}(#${rank})` : name;
  });

  // Current live group names
  const currentGroupNames =
    diag.currentGroupRacers.length > 0
      ? diag.currentGroupRacers.map((r) => r?.name ?? r?.id ?? '?').join(', ')
      : '—';

  return (
    <div style={PANEL_STYLE} data-testid="battle-diag-hud">
      <div style={{ marginBottom: '2px', letterSpacing: '0.05em' }}>
        <span style={{ color: '#ff6a00', fontWeight: 700 }}>BATTLE DIAG</span>
      </div>
      <div>
        Status:{' '}
        <span style={diag.active ? LABEL_ACTIVE : LABEL_INACTIVE}>
          {diag.active ? 'ACTIVE' : 'idle'}
        </span>
        {diag.active && !diag.isPulkNow && (
          <span style={{ color: '#ffcc00', marginLeft: '6px' }}>(dissolving)</span>
        )}
      </div>
      <div>
        Group:{' '}
        <span style={{ color: GROUP_COLOR }}>
          {groupWithRanks.length > 0 ? groupWithRanks.join(', ') : '—'}
        </span>
      </div>
      <div>
        Size:{' '}
        <span style={{ color: GROUP_COLOR }}>{diag.groupSize > 0 ? diag.groupSize : '—'}</span>
      </div>
      <div>
        Isolation:{' '}
        <span
          style={
            diag.isolationThresholdT > 0
              ? diag.isGroupIsolated
                ? { color: VALID_COLOR }
                : { color: INVALID_COLOR }
              : { color: '#888' }
          }
        >
          {diag.isolationThresholdT > 0 ? (diag.isGroupIsolated ? '✓' : '✗') : 'off'}
        </span>
        {diag.isolationThresholdT > 0 && (
          <span style={{ color: '#666', marginLeft: '4px' }}>
            ({(diag.isolationThresholdT * 100).toFixed(1)}% lap)
          </span>
        )}
      </div>
      <div>
        Orig valid:{' '}
        <span
          style={
            diag.active
              ? diag.originalGroupValid
                ? { color: VALID_COLOR }
                : { color: INVALID_COLOR }
              : { color: '#888' }
          }
        >
          {diag.active ? (diag.originalGroupValid ? '✓' : '✗') : '—'}
        </span>
      </div>
      <div>
        Current group: <span style={{ color: GROUP_COLOR }}>{currentGroupNames}</span>
      </div>
      <div>
        Cam locked:{' '}
        <span style={{ color: LOCKED_COLOR }}>{diag.lockedRacer ? lockedName : '—'}</span>
      </div>
      <div style={{ color: '#666', marginTop: '2px' }}>
        Any pulk now: {diag.isPulkNow ? '✓' : '✗'}
      </div>
      {diag.groupPairwiseTemporal?.length > 0 && (
        <div
          style={{
            color: '#555',
            marginTop: '3px',
            borderTop: '1px solid rgba(255,100,0,0.25)',
            paddingTop: '2px',
          }}
        >
          <div>
            Arc gap:{' '}
            <span style={{ color: '#aaa' }}>
              {diag.groupPairwiseTemporal.map((p) => `${p.a}↔${p.b}=Δ${p.dt}`).join(', ')}
            </span>
            {'  '}
            <span style={{ color: '#666' }}>(thr {diag.closenessThresholdT})</span>
          </div>
        </div>
      )}
      <div
        style={{
          color: '#555',
          fontSize: '9px',
          marginTop: '3px',
          borderTop: '1px solid rgba(255,100,0,0.25)',
          paddingTop: '2px',
        }}
      >
        Dots: red=leader pos • purple=cam center
      </div>
    </div>
  );
}
