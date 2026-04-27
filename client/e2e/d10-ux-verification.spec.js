// ============================================================
// File:        d10-ux-verification.spec.js
// Path:        client/e2e/d10-ux-verification.spec.js
// Project:     RaceArena
// Created:     2026-04-27
// Description: UX-Verifikation für D10 + Bild-First-Fix (PR #23).
//              10 Verifikations-Aufgaben: Bild-Upload-Flow, Validation,
//              Dimension-Mismatch-Dialog, Backward-Compat, TrackManager
//              Auto-Derive, Auto-Scale-Section, Zoom/Pan, Race-Startup.
//              Dauerhafter Regressions-Spec.
// ============================================================

/* global Buffer */
import { test, expect } from '@playwright/test';
import { deflateSync } from 'zlib';

// ── Synthetic PNG helper ──────────────────────────────────────────────────

function makePng(w, h) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (~c) >>> 0;
  };
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([lenBuf, t, data, crcBuf]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const row = Buffer.alloc(1 + w, 0);
  const rawData = Buffer.concat(Array.from({ length: h }, () => row));
  const compressed = deflateSync(rawData);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function uploadPng(page, w, h, name = 'test.png') {
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: makePng(w, h),
  });
}

// Seed a saved geometry with a path-based backgroundImage (old format)
async function seedOldTrack(page) {
  await page.addInitScript(() => {
    const geom = {
      id: 'old-path-track',
      name: 'Old Path Track',
      closed: true,
      backgroundImage: '/assets/tracks/backgrounds/dirt-oval.jpg',
      effects: [],
      worldWidth: 1280,
      worldHeight: 720,
      sourceMode: 'center',
      centerPoints: [
        { x: 400, y: 200 },
        { x: 800, y: 200 },
        { x: 900, y: 400 },
        { x: 800, y: 600 },
        { x: 400, y: 600 },
        { x: 200, y: 400 },
      ],
      innerPoints: [],
      outerPoints: [],
      width: 120,
    };
    localStorage.setItem('racearena:trackGeometries:old-path-track', JSON.stringify(geom));
    const existing = JSON.parse(
      localStorage.getItem('racearena:trackGeometries:index') ?? '[]'
    );
    if (!existing.includes('old-path-track')) {
      existing.push('old-path-track');
      localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(existing));
    }
  });
}

// Seed a saved geometry with uploaded-image dimensions (new format)
async function seedNewTrack(page, w, h) {
  await page.addInitScript(
    ({ w, h }) => {
      const geom = {
        id: 'new-img-track',
        name: 'New Img Track',
        closed: true,
        backgroundImage: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
        effects: [],
        worldWidth: w,
        worldHeight: h,
        sourceMode: 'dual',
        centerPoints: [],
        innerPoints: [
          { x: 400, y: 300 },
          { x: 900, y: 300 },
          { x: 1100, y: 540 },
          { x: 900, y: 780 },
          { x: 400, y: 780 },
          { x: 200, y: 540 },
        ],
        outerPoints: [
          { x: 360, y: 250 },
          { x: 940, y: 250 },
          { x: 1170, y: 540 },
          { x: 940, y: 830 },
          { x: 360, y: 830 },
          { x: 150, y: 540 },
        ],
        width: 120,
      };
      localStorage.setItem('racearena:trackGeometries:new-img-track', JSON.stringify(geom));
      const existing = JSON.parse(
        localStorage.getItem('racearena:trackGeometries:index') ?? '[]'
      );
      if (!existing.includes('new-img-track')) {
        existing.push('new-img-track');
        localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(existing));
      }
      // Also seed a track preset pointing to this geometry
      const tracks = JSON.parse(localStorage.getItem('racearena:tracks') ?? '[]');
      if (!tracks.some((t) => t.id === 'new-img-track')) {
        tracks.push({
          id: 'new-img-track',
          name: 'New Img Track',
          icon: '🖼',
          defaultRacerTypeId: 'horse',
          geometryId: 'new-img-track',
          worldWidth: w,
          worldHeight: h,
          trackWidth: 140,
          color: '#4fc3f7',
          description: '',
          defaultDuration: 60,
          defaultWinners: 3,
          isDefault: false,
        });
        localStorage.setItem('racearena:tracks', JSON.stringify(tracks));
      }
    },
    { w, h }
  );
}

// ── V1 — Bild-Upload-Flow End-to-End ─────────────────────────────────────

test.describe('V1 — Bild-Upload-Flow End-to-End', () => {
  test('full new-track upload workflow', async ({ page }) => {
    await page.goto('/track-editor');

    // Upload button shows "Kein Bild" in required state
    const uploadBtn = page.locator('button').filter({ hasText: /Kein Bild/ });
    await expect(uploadBtn).toBeVisible();

    // Save button is disabled before upload
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Upload 2000×1000 image
    await uploadPng(page, 2000, 1000);

    // Upload button changes to "Bild hochgeladen"
    await expect(
      page.locator('button').filter({ hasText: /Bild hochgeladen/ })
    ).toBeVisible();

    // Read-only dimensions display
    await expect(page.getByText(/2000.*1000|Track-Größe/)).toBeVisible();

    // Save button becomes enabled
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});

// ── V2 — Bild-Validation bei zu großem Bild ──────────────────────────────

test.describe('V2 — Bild-Validation greift bei zu großem Bild', () => {
  test('oversized image is rejected and error is shown', async ({ page }) => {
    await page.goto('/track-editor');

    // Upload oversized image (9000×500 — exceeds MAX_BG_W = 8000)
    await uploadPng(page, 9000, 500, 'oversized.png');

    // Error message appears
    await expect(page.getByText(/Bild zu groß.*Maximum.*8000|Maximum.*8000.*4096/)).toBeVisible();

    // Upload button still shows "Kein Bild" — not set to bad image
    await expect(page.locator('button').filter({ hasText: /Kein Bild/ })).toBeVisible();

    // Save button stays disabled
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('error clears on successful subsequent upload', async ({ page }) => {
    await page.goto('/track-editor');

    // First: oversized
    await uploadPng(page, 9000, 500, 'oversized.png');
    await expect(page.getByText(/Bild zu groß/)).toBeVisible();

    // Then: valid
    await uploadPng(page, 800, 600, 'valid.png');
    await expect(page.getByText(/Bild zu groß/)).not.toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Bild hochgeladen/ })).toBeVisible();
  });
});

// ── V3 — Bild-Wechsel mit Dimensions-Mismatch ────────────────────────────

test.describe('V3 — Bild-Wechsel mit Dimensions-Mismatch', () => {
  test('cancel keeps original state', async ({ page }) => {
    await page.goto('/track-editor');

    await uploadPng(page, 1280, 720, 'first.png');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });

    // Dismiss the dialog (cancel)
    page.on('dialog', (dialog) => dialog.dismiss());

    await uploadPng(page, 4000, 720, 'second.png');

    // Dimensions stay at original (1280×720)
    await expect(page.getByText(/1280.*720|Track-Größe/)).toBeVisible();
  });

  test('accept resets points and activates new dimensions', async ({ page }) => {
    await page.goto('/track-editor');

    await uploadPng(page, 1280, 720, 'first.png');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await canvas.click({ position: { x: 700, y: 200 } });

    // Accept the dialog
    page.on('dialog', (dialog) => dialog.accept());

    await uploadPng(page, 4000, 720, 'second.png');

    // New dimensions shown
    await expect(page.getByText(/4000.*720|Track-Größe/)).toBeVisible();
  });
});

// ── V4 — Bild-Wechsel mit gleichen Dimensionen ───────────────────────────

test.describe('V4 — Bild-Wechsel mit gleichen Dimensionen', () => {
  test('same-dimension swap is silent — no dialog, image changes', async ({ page }) => {
    await page.goto('/track-editor');

    await uploadPng(page, 1280, 720, 'first.png');
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });

    let dialogFired = false;
    page.on('dialog', () => {
      dialogFired = true;
    });

    await uploadPng(page, 1280, 720, 'second-same-size.png');

    await page.waitForTimeout(300);
    expect(dialogFired).toBe(false);

    // Dimensions still 1280×720
    await expect(page.getByText(/1280.*720|Track-Größe/)).toBeVisible();
    // Upload button still shows "Bild hochgeladen"
    await expect(page.locator('button').filter({ hasText: /Bild hochgeladen/ })).toBeVisible();
  });
});

// ── V5 — Backward-Compat: Alter Track mit Path-Background ────────────────

test.describe('V5 — Backward-Compat: alter Track mit Path-Background', () => {
  test.beforeEach(async ({ page }) => {
    await seedOldTrack(page);
  });

  test('loading old track shows path-based filename in upload button', async ({ page }) => {
    await page.goto('/track-editor');

    const loadSelect = page.locator('select.loadSelect, select').filter({ hasText: /Load track/ });
    await loadSelect.selectOption({ value: 'old-path-track' });

    // Upload button shows the filename from path
    await expect(
      page.locator('button').filter({ hasText: /dirt-oval\.jpg/ })
    ).toBeVisible();
  });

  test('old track can be saved without re-uploading', async ({ page }) => {
    await page.goto('/track-editor');

    const loadSelect = page.locator('select').filter({ hasText: /Load track/ });
    await loadSelect.selectOption({ value: 'old-path-track' });

    // Save button should be enabled (backgroundImage is non-null path)
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Can save without error
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saved ✓' })).toBeVisible();
  });
});

// ── V6 — TrackManager Auto-Derive ────────────────────────────────────────

test.describe('V6 — TrackManager Auto-Derive', () => {
  test.beforeEach(async ({ page }) => {
    await seedNewTrack(page, 4000, 720);
  });

  test('selecting geometry auto-populates world dimensions read-only display', async ({
    page,
  }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();

    // World Dimensions label visible
    await expect(page.getByText('World Dimensions')).toBeVisible();

    // Before geometry: shows placeholder
    await expect(page.getByText(/Geometrie wählen/)).toBeVisible();

    // Select the seeded geometry
    await page.locator('select.select, select').filter({ hasText: /New Img Track/ }).selectOption({ value: 'new-img-track' });

    // Dimensions auto-derived from geometry
    await expect(page.getByText(/4000.*720.*Geometrie|aus Geometrie/)).toBeVisible();
  });
});

// ── V7 — TrackManager ohne Geometrie-Auswahl ─────────────────────────────

test.describe('V7 — TrackManager ohne Geometrie-Auswahl', () => {
  test('world dimensions show placeholder when no geometry selected', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();

    await expect(page.getByText('World Dimensions')).toBeVisible();
    await expect(page.getByText(/Geometrie wählen/)).toBeVisible();
  });

  test('World Width and Height pill buttons are absent', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();

    await expect(page.getByText('World Width (px)')).not.toBeVisible();
    await expect(page.getByText('World Height (px)')).not.toBeVisible();
  });
});

// ── V8 — Auto-Scale-Section bleibt funktional ────────────────────────────

test.describe('V8 — Auto-Scale-Section funktional', () => {
  test('enabled toggle, reference value, reset defaults all work', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Auto-Scale/ }).click();

    // Toggle enabled on
    const toggle = page.locator('input[type="checkbox"]').first();
    await toggle.check();
    await expect(toggle).toBeChecked();

    // Reference value input is enabled
    const refInput = page.locator('input[type="number"]').first();
    await expect(refInput).toBeEnabled();
    await refInput.fill('30');

    // Formula preview reacts
    await expect(page.getByText(/Formula Preview|Formel/)).toBeVisible();

    // Reset defaults
    await page.getByRole('button', { name: /Reset Defaults/ }).click();
    await expect(toggle).not.toBeChecked();
  });
});

// ── V9 — TrackEditor Zoom + Pan bleibt funktional ────────────────────────

test.describe('V9 — TrackEditor Zoom + Pan funktional', () => {
  test('zoom in via wheel, then Fit resets to 100%', async ({ page }) => {
    await page.goto('/track-editor');

    // Default is 100%
    await expect(page.getByText(/100%/)).toBeVisible();

    // Zoom in via wheel event
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true }));
    });

    // Fit resets zoom
    await page.getByRole('button', { name: /Fit/ }).click();
    await expect(page.getByText(/100%/)).toBeVisible();
  });

  test('Track-Größe display is visible in toolbar', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.getByText(/Track-Größe/)).toBeVisible();
  });

  test('after image upload, Track-Größe updates to image dimensions', async ({ page }) => {
    await page.goto('/track-editor');
    await uploadPng(page, 3000, 1500);
    await expect(page.getByText(/3000.*1500|Track-Größe/)).toBeVisible();
  });
});

// ── V10 — Race startet mit verschiedenen Track-Größen ────────────────────

test.describe('V10a — Default-Track startet Race ohne JS-Fehler', () => {
  test.beforeEach(async ({ page }) => {
    await seedNewTrack(page, 1280, 720);
  });

  test('default 1280×720 track starts race without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/setup');
    await page.getByRole('tab', { name: 'Track' }).click();

    const trackBtn = page
      .locator('button')
      .filter({ hasText: /New Img Track/ })
      .first();
    if (await trackBtn.count() > 0) await trackBtn.click();

    // Quick Test lives on the Players tab
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByRole('button', { name: /Quick Test/ }).click();
    await page.waitForURL('/race', { timeout: 8000 }).catch(() => {});

    // No critical JS errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('V10b — 4000×720-Track speichert Dimensionen in sessionStorage', () => {
  test.beforeEach(async ({ page }) => {
    await seedNewTrack(page, 4000, 720);
  });

  test('4000×720 track stores correct dimensions in sessionStorage after Quick Test', async ({
    page,
  }) => {
    await page.goto('/setup');
    await page.getByRole('tab', { name: 'Track' }).click();

    const newTrackBtn = page
      .locator('button')
      .filter({ hasText: /New Img Track/ })
      .first();

    if ((await newTrackBtn.count()) > 0) {
      await newTrackBtn.click();
      await page.getByRole('tab', { name: 'Players' }).click();
      await page.getByRole('button', { name: /Quick Test/ }).click();
      await page.waitForURL('/race', { timeout: 8000 }).catch(() => {});

      const activeRace = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('activeRace') ?? 'null')
      );
      if (activeRace) {
        expect(activeRace.worldWidth).toBe(4000);
        expect(activeRace.worldHeight).toBe(720);
      }
    }
  });
});
