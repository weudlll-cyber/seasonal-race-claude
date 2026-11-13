// ============================================================
// File:        QrShareButtons.jsx
// Path:        client/src/components/QrCode/QrShareButtons.jsx
// Project:     RaceArena — REGISTRATION-1 (follow-up 1, the owner's request of 2026-10-21)
// Description: "Copy QR code" and "Download QR" for a join link — on the registration's view and in
//              the full-screen QR stage. Copy puts the code on the clipboard as a PNG image, so it can
//              be pasted into Telegram or Discord; Download saves the same PNG as
//              racearena-join-<event or track>.png. When the browser cannot copy an image, Copy says
//              so and points to Download. Both draw on this device (modules/registration/qrImage.js).
//              `buttonClassName` styles the two buttons (the registration's view passes the Setup
//              screen's secondary button, 2026-11-13); without it they are drawn as before.
// ============================================================

import { useState } from 'react';
import { copyQrImage, downloadQr, qrFileName } from '../../modules/registration/qrImage.js';

/**
 * @param {{ link: string, eventName?: string|null, trackName?: string, className?: string,
 *            buttonClassName?: string }} props
 */
export default function QrShareButtons({ link, eventName, trackName, className, buttonClassName }) {
  const [note, setNote] = useState('');

  async function copy() {
    setNote('');
    const ok = await copyQrImage(link);
    setNote(
      ok
        ? 'QR code copied — paste it as a picture.'
        : 'This browser cannot copy a picture. Use "Download QR" and send the file instead.'
    );
  }

  return (
    <span className={className}>
      <button type="button" className={buttonClassName} onClick={copy}>
        Copy QR code
      </button>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => downloadQr(link, qrFileName(eventName, trackName))}
      >
        Download QR
      </button>
      {note && (
        <span role="status" data-testid="qr-share-note">
          {note}
        </span>
      )}
    </span>
  );
}
