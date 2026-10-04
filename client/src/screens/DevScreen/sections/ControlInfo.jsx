// ============================================================
// File:        ControlInfo.jsx
// Path:        client/src/screens/DevScreen/sections/ControlInfo.jsx
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1
// Created:     2026-10-05
// Description: The two small pieces every Dev Screen control is marked up with. `Info` is the
//              control's info icon — the existing InfoTooltip, its text read from the one home
//              in controlInfo.js. `Ctl` wraps a control that has no row of its own (a button in
//              a list row, a header Reset) so it still carries its data-control-id and its info
//              icon side by side. A control that does have a row puts data-control-id on that row
//              and an `Info` in its label instead.
// ============================================================

import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { CONTROL_INFO } from './controlInfo.js';

/** The info icon of the control `id` ("<section file>:<identity>"). */
export function Info({ id }) {
  return <InfoTooltip text={CONTROL_INFO[id]} />;
}

/** A control with its id and its info icon, for controls that sit inline rather than in a row. */
export function Ctl({ id, children, style }) {
  return (
    <span
      data-control-id={id}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', ...style }}
    >
      {children}
      <Info id={id} />
    </span>
  );
}
