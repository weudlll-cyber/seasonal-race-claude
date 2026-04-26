// ============================================================
// File:        InfoTooltip.jsx
// Path:        client/src/components/InfoTooltip/InfoTooltip.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Reusable info icon with hover/focus tooltip.
//              Phase T will retrofit existing Dev-Screen fields to use this.
// ============================================================

import s from './InfoTooltip.module.css';

/**
 * Renders a small ⓘ icon. On hover (desktop) or focus (keyboard), a tooltip
 * with the provided text appears above the icon.
 *
 * @param {object} props
 * @param {string} props.text  - Tooltip content
 * @param {boolean} [props.alignRight] - Pin tooltip to right edge (avoids viewport clip)
 */
export function InfoTooltip({ text, alignRight = false }) {
  return (
    <span className={s.wrapper}>
      <span className={s.icon} tabIndex={0} role="img" aria-label={text}>
        i
      </span>
      <span className={`${s.tip}${alignRight ? ` ${s.tipRight}` : ''}`} role="tooltip">
        {text}
      </span>
    </span>
  );
}

export default InfoTooltip;
