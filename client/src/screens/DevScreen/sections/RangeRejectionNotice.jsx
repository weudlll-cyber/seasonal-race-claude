// ============================================================
// File:        RangeRejectionNotice.jsx
// Path:        client/src/screens/DevScreen/sections/RangeRejectionNotice.jsx
// Project:     RaceArena — POLISH-2026-09-24B piece 3(f)
// Description: Say that a typed value was rejected, instead of silently ignoring it.
//
// ── ★ THE BEHAVIOUR THIS REPLACES ──────────────────────────────────────────────────────────────
// Several Dev Screen number fields guard their `set()` with a bare condition:
//     if (v > config.minScale) set('maxScale', v);
// Type something outside the range and NOTHING happens. The input shows what was typed, the stored
// value is unchanged, and there is no way to tell the difference between "accepted" and "ignored"
// except by reloading. That is the quiet failure this notice ends.
//
// ── ★ WHAT IS REUSED RATHER THAN INVENTED ──────────────────────────────────────────────────────
// The amber warning treatment already in the Dev Screen — `RACE_PLAN_TIMING_WARNING_STYLE` in
// `DynamicsTuningSection.jsx:69-77`. The values are copied here rather than imported because that
// constant is module-private to a section that has no reason to export its styling; the shape and
// the colours are the same, so the two read as one thing on screen.
//
// ── WHY A COMPONENT AND NOT A `title` ATTRIBUTE ────────────────────────────────────────────────
// A tooltip is only seen by someone already hovering the field they are confused about. A rejection
// has to be visible without being looked for.
// ============================================================

const STYLE = {
  fontSize: '0.75rem',
  color: '#f59e0b',
  background: 'rgba(245,158,11,0.08)',
  border: '1px solid rgba(245,158,11,0.28)',
  borderRadius: '4px',
  padding: '0.3rem 0.5rem',
  marginTop: '0.35rem',
  lineHeight: 1.4,
};

/**
 * @param {object}  props
 * @param {string|null} props.message  what was rejected and why; null renders nothing
 * @param {string}  [props.testId]     so a test can assert the rejection was SHOWN
 */
export default function RangeRejectionNotice({ message, testId = 'range-rejection' }) {
  if (!message) return null;
  return (
    <p style={STYLE} data-testid={testId} role="status">
      ⚠️ {message}
    </p>
  );
}
