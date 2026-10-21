// ============================================================
// File:        QrCode.jsx
// Path:        client/src/components/QrCode/QrCode.jsx
// Project:     RaceArena — REGISTRATION-1
// Description: A QR code for a text (the registration's join link), drawn on THIS device as one SVG
//              path of dark squares on a white field, quiet zone included. The modules come from
//              `qrMatrix` (modules/registration/qrImage.js, over `lean-qr`), the same matrix the PNG
//              of "Copy QR code" and "Download QR" is drawn from. No external service is asked,
//              nothing is injected as markup, and no inline style or script is needed, so the
//              Content-Security-Policy is untouched.
//
// The SVG scales to whatever box it is given (`viewBox`), which is how the same component serves the
// small code beside the link and the full-screen stage view; `crispEdges` keeps the modules sharp at
// any size.
// ============================================================

import { useMemo } from 'react';
import { qrMatrix } from '../../modules/registration/qrImage.js';

/**
 * @param {{ text: string, label?: string, className?: string }} props
 */
export default function QrCode({ text, label = 'QR code', className }) {
  const { size, path } = useMemo(() => {
    const { size: n, dark } = qrMatrix(text);
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (dark(x, y)) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: n, path: d };
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
