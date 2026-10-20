// ============================================================
// File:        QrCode.jsx
// Path:        client/src/components/QrCode/QrCode.jsx
// Project:     RaceArena — REGISTRATION-1
// Description: A QR code for a text (the registration's join link), drawn on THIS device. The
//              matrix comes from `lean-qr` (MIT, no dependencies, pure JavaScript); it is drawn here
//              as one SVG path of dark squares on a white field with the standard four-module quiet
//              zone. No external service is asked, nothing is injected as markup, and no inline style
//              or script is needed, so the Content-Security-Policy is untouched.
//
// The SVG scales to whatever box it is given (`viewBox`), which is how the same component serves the
// small code beside the link and the full-screen stage view; `crispEdges` keeps the modules sharp at
// any size.
// ============================================================

import { useMemo } from 'react';
import { generate } from 'lean-qr';

/** The light margin around the code, in modules — the QR standard's minimum. */
const QUIET_ZONE = 4;

/**
 * @param {{ text: string, label?: string, className?: string }} props
 */
export default function QrCode({ text, label = 'QR code', className }) {
  const { size, path } = useMemo(() => {
    const code = generate(text);
    let d = '';
    for (let y = 0; y < code.size; y++) {
      for (let x = 0; x < code.size; x++) {
        if (code.get(x, y)) d += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { size: code.size + QUIET_ZONE * 2, path: d };
  }, [text]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      data-testid="qr-code"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
