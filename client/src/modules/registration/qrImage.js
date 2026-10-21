// ============================================================
// File:        qrImage.js
// Path:        client/src/modules/registration/qrImage.js
// Project:     RaceArena — REGISTRATION-1 (follow-up 1, the owner's request of 2026-10-21)
// Description: The join link's QR code as data and as a PNG picture, drawn on this device from
//              `lean-qr` (no service is asked, nothing goes over the network):
//                · `qrMatrix` — the modules with the standard four-module white quiet zone; the
//                  on-screen code (components/QrCode/QrCode.jsx) and the PNG both read it, so they
//                  are the same code;
//                · `qrPngBlob` — a PNG of at least 512 px, black on white, for pasting into Telegram
//                  or Discord or for saving;
//                · `copyQrImage` / `downloadQr` — the clipboard (the Clipboard API's image write) and
//                  a file download; `qrFileName` names the file after the event or the track.
// ============================================================

import { generate } from 'lean-qr';

/** The light margin around the code, in modules — the QR standard's minimum. */
export const QUIET_ZONE = 4;
/** The smallest PNG this draws, in pixels per side. */
export const MIN_PNG_PX = 512;

/**
 * The QR code of `text`, quiet zone included.
 *
 * @param {string} text
 * @returns {{ size: number, dark: (x: number, y: number) => boolean }}  `size` in modules per side
 */
export function qrMatrix(text) {
  const code = generate(text);
  const inner = code.size;
  return {
    size: inner + QUIET_ZONE * 2,
    dark: (x, y) => {
      const cx = x - QUIET_ZONE;
      const cy = y - QUIET_ZONE;
      return cx >= 0 && cy >= 0 && cx < inner && cy < inner && code.get(cx, cy);
    },
  };
}

/** Whole pixels per module so the picture is at least `minPx` wide. */
export function pngScale(modules, minPx = MIN_PNG_PX) {
  return Math.ceil(minPx / modules);
}

/**
 * The QR code as a PNG: black modules on white, crisp (whole pixels per module).
 *
 * @param {string} text
 * @returns {Promise<Blob>}
 */
export function qrPngBlob(text) {
  const { size, dark } = qrMatrix(text);
  const scale = pngScale(size);
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (dark(x, y)) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no PNG'))), 'image/png')
  );
}

/** "racearena-join-friday-cup.png" — after the event name, else the track name. */
export function qrFileName(eventName, trackName) {
  const slug =
    String(eventName || trackName || 'registration')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'registration';
  return `racearena-join-${slug}.png`;
}

/** Can this browser put an image on the clipboard at all? */
export function canCopyImage() {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
}

/**
 * Put the QR code on the clipboard as a PNG image. False when the browser cannot (no image
 * clipboard, or it refused — a permission, an insecure origin); the caller then points to Download.
 *
 * @returns {Promise<boolean>}
 */
export async function copyQrImage(text) {
  if (!canCopyImage()) return false;
  try {
    // The promise is handed over unresolved: Safari requires it, Chrome and Edge accept it.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': qrPngBlob(text) })]);
    return true;
  } catch {
    return false;
  }
}

/** Save the QR code as a PNG file through the browser's download. */
export async function downloadQr(text, fileName) {
  const url = URL.createObjectURL(await qrPngBlob(text));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  // Revoked after the click has been handled, so the download has its bytes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
