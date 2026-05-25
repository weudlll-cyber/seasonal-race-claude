import EffectConfig from '../../components/EffectConfig/EffectConfig.jsx';
import s from './TrackEditor.module.css';

export default function TrackEditorToolbar({
  mode,
  activeBoundary,
  closed,
  canUndo,
  canRedo,
  centerWidth,
  editorWorldW,
  editorWorldH,
  viewZoom,
  effects,
  trackLights,
  onModeCenter,
  onModeBoundary,
  onBoundaryInner,
  onBoundaryOuter,
  onClosedLoop,
  onOpenCourse,
  onReverse,
  onUndo,
  onRedo,
  onWidthChange,
  onWidthBlur,
  onEffectsChange,
  onLightsChange,
  onLightsStyleChange,
  onFitToScreen,
}) {
  return (
    <div className={s.toolbar}>
      <div className={s.toolbarRow}>
        <div className={s.modeGroup}>
          <button
            className={`${s.modeBtn} ${mode === 'center' ? s.modeBtnActive : ''}`}
            onClick={onModeCenter}
          >
            Center
          </button>
          <button
            className={`${s.modeBtn} ${mode === 'boundary' ? s.modeBtnActive : ''}`}
            onClick={onModeBoundary}
          >
            Boundary
          </button>
        </div>

        {mode === 'boundary' && (
          <div className={s.modeGroup}>
            <button
              className={`${s.modeBtn} ${activeBoundary === 'inner' ? s.modeBtnActive : ''}`}
              onClick={onBoundaryInner}
            >
              Inner
            </button>
            <button
              className={`${s.modeBtn} ${activeBoundary === 'outer' ? s.modeBtnActive : ''}`}
              onClick={onBoundaryOuter}
            >
              Outer
            </button>
          </div>
        )}

        <div className={s.modeGroup}>
          <button
            className={`${s.modeBtn} ${closed ? s.modeBtnActive : ''}`}
            onClick={onClosedLoop}
          >
            Closed Loop
          </button>
          <button
            className={`${s.modeBtn} ${!closed ? s.modeBtnActive : ''}`}
            onClick={onOpenCourse}
          >
            Open Course
          </button>
        </div>

        <button className={s.reverseBtn} disabled={closed} onClick={onReverse}>
          Reverse Direction
        </button>

        <button className={s.historyBtn} disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button
          className={s.historyBtn}
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>

      {mode === 'center' && (
        <div className={s.toolbarRow}>
          <label className={s.sliderLabel}>
            Lane Width: {centerWidth} px
            <input
              type="range"
              min={20}
              max={300}
              step={1}
              value={centerWidth}
              className={s.slider}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              onBlur={onWidthBlur}
            />
          </label>
        </div>
      )}

      <div className={s.toolbarRow}>
        <span className={s.sliderLabel}>Effects:</span>
        <EffectConfig effects={effects} onChange={onEffectsChange} max={3} />
      </div>

      {/* Track Lights */}
      <div
        className={s.toolbarRow}
        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}
      >
        <span className={s.sliderLabel} style={{ fontWeight: 600 }}>
          Track Lights
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--color-muted)', minWidth: '2.5rem' }}>
            Color
          </label>
          <input
            type="color"
            value={trackLights.color}
            onChange={(e) => onLightsChange({ color: e.target.value })}
            style={{
              width: 32,
              height: 24,
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              background: 'none',
            }}
            title="Boundary light color"
          />
          <span
            style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}
          >
            {trackLights.color}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--color-muted)', minWidth: '2.5rem' }}>
            Style
          </label>
          <select
            data-testid="track-lights-style"
            value={trackLights.style}
            onChange={(e) => onLightsStyleChange(e.target.value)}
            style={{ fontSize: '0.8rem' }}
          >
            <option value="steady">Steady</option>
            <option value="sequence">Sequence</option>
            <option value="sync_pulse">Sync Pulse</option>
            <option value="random_flash">Random Flash</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-muted)',
              minWidth: '2.5rem',
              opacity: trackLights.style === 'steady' ? 0.4 : 1,
            }}
          >
            Speed
          </label>
          <input
            data-testid="track-lights-speed"
            type="range"
            min={0.1}
            max={3.0}
            step={0.1}
            value={trackLights.speed}
            disabled={trackLights.style === 'steady'}
            onChange={(e) => onLightsChange({ speed: parseFloat(e.target.value) })}
            style={{ width: 180 }}
            title="Animation speed (disabled for Steady)"
          />
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              minWidth: '2rem',
              opacity: trackLights.style === 'steady' ? 0.4 : 1,
            }}
          >
            {trackLights.speed.toFixed(1)}×
          </span>
        </div>
      </div>

      {/* Viewport controls */}
      <div className={s.toolbarRow}>
        <span className={s.sliderLabel}>
          Track Size: {editorWorldW}×{editorWorldH} px
        </span>
        <button
          className={s.historyBtn}
          onClick={onFitToScreen}
          title="Reset zoom and pan to fit the full world"
        >
          ⊡ Fit
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginLeft: '0.25rem' }}>
          {Math.round(viewZoom * 100)}%
        </span>
      </div>
    </div>
  );
}
