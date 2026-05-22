// ============================================================
// File:        LeadChangeDiagHUD.jsx
// Path:        client/src/screens/RaceScreen/LeadChangeDiagHUD.jsx
// Project:     RaceArena
// Description: LEAD_CHANGE diagnostics overlay for the DevPanel.
//              Shows: current leader, previous leader, pending state,
//              and debounce / gap config.
//              Rendered on top of the race canvas when showLeadChangeDiag is enabled.
// ============================================================

const PANEL_STYLE = {
  position: 'absolute',
  bottom: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(10,10,20,0.82)',
  color: '#fff',
  fontFamily: 'monospace',
  fontSize: '11px',
  lineHeight: '1.5',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(100,180,255,0.6)',
  pointerEvents: 'none',
  zIndex: 20,
  minWidth: '200px',
};

const LABEL_ACTIVE = { color: '#64b4ff', fontWeight: 700 };
const LABEL_INACTIVE = { color: '#888' };
const NAME_COLOR = '#ffd700';
const PREV_COLOR = '#aaa';

/**
 * @param {{ cameraRef: React.MutableRefObject, visible: boolean }} props
 */
export default function LeadChangeDiagHUD({ cameraRef, visible }) {
  if (!visible) return null;

  // eslint-disable-next-line react-hooks/refs
  const dir = cameraRef?.current;
  // eslint-disable-next-line react-hooks/refs
  if (!dir) return null;

  const diag = dir.getLeadChangeDiagData();

  return (
    <div style={PANEL_STYLE} data-testid="lead-change-diag-hud">
      <div style={{ marginBottom: '2px', letterSpacing: '0.05em' }}>
        <span style={{ color: '#64b4ff', fontWeight: 700 }}>LEAD CHANGE DIAG</span>
      </div>
      <div>
        Status:{' '}
        <span style={diag.active ? LABEL_ACTIVE : LABEL_INACTIVE}>
          {diag.active ? 'ACTIVE' : 'idle'}
        </span>
      </div>
      <div>
        Current leader: <span style={{ color: NAME_COLOR }}>{diag.currentLeader ?? '—'}</span>
      </div>
      <div>
        Last change: <span style={{ color: PREV_COLOR }}>{diag.previousLeader ?? '—'}</span>
        {diag.newLeader && <span style={{ color: NAME_COLOR }}> → {diag.newLeader}</span>}
      </div>
      <div>
        Pending:{' '}
        <span style={{ color: diag.pendingChange ? '#ffa500' : '#555' }}>
          {diag.pendingChange ? 'YES' : 'no'}
        </span>
      </div>
      <div
        style={{
          color: '#555',
          marginTop: '3px',
          borderTop: '1px solid rgba(100,180,255,0.2)',
          paddingTop: '3px',
        }}
      >
        <span style={{ color: '#888' }}>
          minGap {(diag.minGap ?? 0.002).toFixed(3)} · debounce {diag.debounceMs ?? 800}ms
        </span>
      </div>
    </div>
  );
}
