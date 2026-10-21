// ============================================================
// File:        QrShareButtons.test.jsx
// Path:        client/src/components/QrCode/QrShareButtons.test.jsx
// Project:     RaceArena — REGISTRATION-1 (follow-up 1)
// Description: "Copy QR code" copies the join link's QR code and says so; where the browser cannot
//              copy a picture it says that and points to "Download QR"; "Download QR" saves the PNG
//              under racearena-join-<event or track>.png. The picture work is mocked here
//              (modules/registration/qrImage.js has its own tests; the playthrough decodes a real PNG).
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const qr = { copyQrImage: vi.fn(), downloadQr: vi.fn() };
vi.mock('../../modules/registration/qrImage.js', async (importOriginal) => ({
  ...(await importOriginal()),
  copyQrImage: (...a) => qr.copyQrImage(...a),
  downloadQr: (...a) => qr.downloadQr(...a),
}));

const { default: QrShareButtons } = await import('./QrShareButtons.jsx');
const LINK = 'http://localhost:4173/join/Ab3_-xYz0123456789AbCd';

beforeEach(() => {
  qr.copyQrImage.mockReset();
  qr.downloadQr.mockReset();
});

describe('Copy QR code', () => {
  it('copies the link’s code and says so', async () => {
    qr.copyQrImage.mockResolvedValue(true);
    render(<QrShareButtons link={LINK} eventName="Friday cup" trackName="Dirt Oval" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy QR code' }));
    expect((await screen.findByTestId('qr-share-note')).textContent).toMatch(/copied/);
    expect(qr.copyQrImage).toHaveBeenCalledWith(LINK);
  });

  it('where the browser cannot copy a picture, says so and points to Download QR', async () => {
    qr.copyQrImage.mockResolvedValue(false);
    render(<QrShareButtons link={LINK} trackName="Dirt Oval" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy QR code' }));
    expect((await screen.findByTestId('qr-share-note')).textContent).toBe(
      'This browser cannot copy a picture. Use "Download QR" and send the file instead.'
    );
  });
});

describe('Download QR', () => {
  it('saves the PNG named after the event', () => {
    render(<QrShareButtons link={LINK} eventName="Friday cup" trackName="Dirt Oval" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download QR' }));
    expect(qr.downloadQr).toHaveBeenCalledWith(LINK, 'racearena-join-friday-cup.png');
  });
});
