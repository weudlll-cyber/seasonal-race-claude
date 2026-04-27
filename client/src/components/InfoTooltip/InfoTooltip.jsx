// ============================================================
// File:        InfoTooltip.jsx
// Path:        client/src/components/InfoTooltip/InfoTooltip.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Reusable info icon with hover/focus tooltip.
//              Phase T will retrofit existing Dev-Screen fields to use this.
// ============================================================

import { useRef, useState } from 'react';
import s from './InfoTooltip.module.css';

const TIP_WIDTH = 220;

export function InfoTooltip({ text }) {
  const wrapperRef = useRef(null);
  const [alignRight, setAlignRight] = useState(false);

  function handleShow() {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setAlignRight(rect.left + TIP_WIDTH / 2 > window.innerWidth - 16);
    }
  }

  return (
    <span className={s.wrapper} ref={wrapperRef} onMouseEnter={handleShow} onFocus={handleShow}>
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
