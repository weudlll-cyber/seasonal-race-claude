// ============================================================
// File:        RangeSlider.jsx
// Path:        client/src/screens/DevScreen/components/RangeSlider.jsx
// Project:     RaceArena
// Description: Shared range-input row used by DevScreen sections. The wrapper
//              and the <input type="range"> are shared; the display cell is
//              passed as children so callers can preserve their own span
//              styling verbatim. Extraction of a pattern that was inlined in
//              BrandingProfiles (twice) and SurfaceClassManager (once).
// ============================================================

export function RangeSlider({ min, max, step, value, onChange, ariaLabel, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        style={{ flex: 1 }}
      />
      {children}
    </div>
  );
}
