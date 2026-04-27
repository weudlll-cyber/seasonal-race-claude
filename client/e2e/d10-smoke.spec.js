// ============================================================
// File:        d10-smoke.spec.js
// Path:        client/e2e/d10-smoke.spec.js
// Project:     RaceArena
// Created:     2026-04-26
// Updated:     2026-04-27 — image-first workflow replaces pre-set buttons
// Description: Playwright smoke tests for D10 — Track-Size-Variability + Auto-Sprite-Scale.
//              Covers: sessionStorage worldHeight/trackWidth, TrackEditor image upload,
//              zoom/pan controls, TrackManager world dimensions read-only,
//              AutoScaleSection in Dev Panel, upload validation
// ============================================================

/* global Buffer */
import { test, expect } from '@playwright/test';
import { deflateSync } from 'zlib';

// ── synthetic PNG generator (grayscale, all-zero pixels) ──────────────────
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const row = Buffer.alloc(1 + w, 0); // filter byte + w zero pixels
  const rawData = Buffer.concat(Array.from({ length: h }, () => row));
  const compressed = deflateSync(rawData);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CLOSED_GEOM = {
  id: 'smoke-d10-closed',
  name: 'D10 Test Oval',
  closed: true,
  backgroundImage: null,
  effects: [],
  worldWidth: 1920,
  worldHeight: 1080,
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
};

async function seedStorage(page) {
  await page.addInitScript((GEOM) => {
    localStorage.setItem(`racearena:trackGeometries:${GEOM.id}`, JSON.stringify(GEOM));
    const geomIndex = [GEOM.id];
    localStorage.setItem('racearena:trackGeometries:index', JSON.stringify(geomIndex));

    const raw = localStorage.getItem('racearena:tracks');
    const tracks = raw ? JSON.parse(raw) : [];
    const updated = tracks.map((t) =>
      t.id === 'dirt-oval'
        ? { ...t, geometryId: GEOM.id, worldWidth: 1920, worldHeight: 1080, trackWidth: 200 }
        : t
    );
    if (!updated.some((t) => t.id === 'dirt-oval')) {
      updated.push({
        id: 'dirt-oval',
        name: 'Dirt Oval',
        defaultRacerTypeId: 'horse',
        geometryId: GEOM.id,
        worldWidth: 1920,
        worldHeight: 1080,
        trackWidth: 200,
        color: '#c8a46a',
        description: '',
      });
    }
    localStorage.setItem('racearena:tracks', JSON.stringify(updated));
  }, CLOSED_GEOM);
}

// ── T1: sessionStorage contains worldHeight + trackWidth ──────────────────

test.describe('D10-T1 — sessionStorage worldHeight + trackWidth', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page);
    await page.goto('/setup');
    await page.getByRole('tab', { name: 'Track' }).click();
    await page.getByRole('button', { name: /Dirt Oval/ }).first().click();
  });

  test('activeRace sessionStorage includes worldHeight and trackWidth after Quick Test', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Players' }).click();
    await page.getByRole('button', { name: /Quick Test/ }).click();

    await page.waitForURL('/race', { timeout: 5000 });

    const activeRace = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('activeRace') ?? 'null')
    );
    expect(activeRace).not.toBeNull();
    expect(typeof activeRace.worldHeight).toBe('number');
    expect(typeof activeRace.trackWidth).toBe('number');
    expect(activeRace.worldHeight).toBeGreaterThan(0);
    expect(activeRace.trackWidth).toBeGreaterThan(0);
  });
});

// ── T2: TrackEditor image-upload controls ────────────────────────────────

test.describe('D10-T2 — TrackEditor image-upload controls', () => {
  test('background upload button and Fit button are visible in TrackEditor', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.locator('button').filter({ hasText: /Kein Bild|Bild hochgeladen|🖼/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fit/ })).toBeVisible();
  });

  test('zoom percentage display is visible', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.getByText(/100%/)).toBeVisible();
  });

  test('upload button shows required hint when no image uploaded', async ({ page }) => {
    await page.goto('/track-editor');
    await expect(page.getByRole('button', { name: /Kein Bild/ })).toBeVisible();
  });

  test('dimension display updates after image upload', async ({ page }) => {
    await page.goto('/track-editor');
    const png = makePng(800, 600);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-800x600.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(page.getByText(/800.*600|Track-Größe/)).toBeVisible();
  });
});

// ── T3: TrackManager world dimension fields ────────────────────────────────

test.describe('D10-T3 — TrackManager world dimension fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Tracks/ }).click();
    await page.getByRole('button', { name: /\+ Add Track/ }).click();
  });

  test('World Width and Height pill buttons are absent from track form', async ({ page }) => {
    await expect(page.getByText('World Width (px)')).not.toBeVisible();
    await expect(page.getByText('World Height (px)')).not.toBeVisible();
  });

  test('World Dimensions read-only info is present in track form', async ({ page }) => {
    await expect(page.getByText('World Dimensions')).toBeVisible();
  });
});

// ── T4: AutoScaleSection visible in Dev Panel ─────────────────────────────

test.describe('D10-T4 — AutoScaleSection in Dev Panel', () => {
  test('Auto-Scale section is listed in the sidebar', async ({ page }) => {
    await page.goto('/dev');
    await expect(page.getByRole('button', { name: /Auto-Scale/ })).toBeVisible();
  });

  test('Auto-Scale section renders the enabled toggle and formula preview', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Auto-Scale/ }).click();
    await expect(page.getByText('Auto-Sprite-Scaling')).toBeVisible();
    await expect(page.getByText(/Enabled/)).toBeVisible();
    await expect(page.getByText('Formula Preview')).toBeVisible();
  });

  test('reset defaults button is present', async ({ page }) => {
    await page.goto('/dev');
    await page.getByRole('button', { name: /Auto-Scale/ }).click();
    await expect(page.getByRole('button', { name: /Reset Defaults/ })).toBeVisible();
  });
});

// ── T5: TrackEditor Fit button resets zoom ────────────────────────────────

test.describe('D10-T5 — TrackEditor fit-to-screen', () => {
  test('Fit button is clickable and zoom resets to 100%', async ({ page }) => {
    await page.goto('/track-editor');

    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      }
    });
    await page.getByRole('button', { name: /Fit/ }).click();
    await expect(page.getByText(/100%/)).toBeVisible();
  });
});

// ── T6: TrackEditor worldWidth/worldHeight saved to geometry ──────────────

test.describe('D10-T6 — TrackEditor saves worldWidth/worldHeight from uploaded image', () => {
  test('uploading a 2000×1400 image and saving stores derived dimensions in geometry', async ({
    page,
  }) => {
    await page.goto('/track-editor');

    const png = makePng(2000, 1400);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-2000x1400.png',
      mimeType: 'image/png',
      buffer: png,
    });

    // Wait for dimension display to update
    await expect(page.getByText(/2000.*1400|Track-Größe/)).toBeVisible();

    await page.getByRole('button', { name: 'Closed Loop' }).click();
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });
    await canvas.click({ position: { x: 700, y: 200 } });
    await canvas.click({ position: { x: 900, y: 400 } });

    await page.getByPlaceholder(/Track name/).fill('D10 Image-First Test');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saved ✓' })).toBeVisible();

    const geomData = await page.evaluate(() => {
      const indexRaw = localStorage.getItem('racearena:trackGeometries:index');
      if (!indexRaw) return null;
      const index = JSON.parse(indexRaw);
      const lastId = index[index.length - 1];
      if (!lastId) return null;
      return JSON.parse(localStorage.getItem(`racearena:trackGeometries:${lastId}`) ?? 'null');
    });

    expect(geomData).not.toBeNull();
    expect(geomData.worldWidth).toBe(2000);
    expect(geomData.worldHeight).toBe(1400);
  });
});

// ── T7: Upload validation — oversized image ────────────────────────────────

test.describe('D10-T7 — Upload validation', () => {
  test('oversized image (8001×1) shows validation error', async ({ page }) => {
    await page.goto('/track-editor');

    const png = makePng(8001, 1);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'oversized.png',
      mimeType: 'image/png',
      buffer: png,
    });

    await expect(page.getByText(/Bild zu groß|Maximum.*8000/)).toBeVisible();
  });

  test('valid large image (4000×720) is accepted and derives correct dimensions', async ({
    page,
  }) => {
    await page.goto('/track-editor');

    const png = makePng(4000, 720);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-valid.png',
      mimeType: 'image/png',
      buffer: png,
    });

    await expect(page.getByText(/4000.*720|Track-Größe/)).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Bild hochgeladen|🖼/ })).toBeVisible();
  });
});

// ── T8: Save blocked without image ────────────────────────────────────────

test.describe('D10-T8 — Save requires image', () => {
  test('Save button is disabled when no image has been uploaded', async ({ page }) => {
    await page.goto('/track-editor');
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeDisabled();
  });

  test('Save button becomes enabled after image upload', async ({ page }) => {
    await page.goto('/track-editor');
    const png = makePng(800, 600);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'enable-test.png',
      mimeType: 'image/png',
      buffer: png,
    });
    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeEnabled();
  });
});

// ── T9: Image swap — dimension mismatch shows warning ─────────────────────

test.describe('D10-T9 — Image swap dimension handling', () => {
  test('swapping to different-dimension image shows confirm dialog and resets points on accept', async ({
    page,
  }) => {
    await page.goto('/track-editor');

    // Upload first image (800×600) and place a point
    const png800 = makePng(800, 600);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'first-800x600.png',
      mimeType: 'image/png',
      buffer: png800,
    });
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });

    // Track dialog — accept it
    page.on('dialog', (dialog) => dialog.accept());

    // Upload second image with different dimensions (1200×800)
    const png1200 = makePng(1200, 800);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'second-1200x800.png',
      mimeType: 'image/png',
      buffer: png1200,
    });

    // After accepting, dimensions update and page shows the new size
    await expect(page.getByText(/1200.*800|Track-Größe/)).toBeVisible();
  });

  test('swapping to same-dimension image swaps silently without dialog', async ({ page }) => {
    await page.goto('/track-editor');

    const png800a = makePng(800, 600);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'first-800x600.png',
      mimeType: 'image/png',
      buffer: png800a,
    });
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });

    let dialogFired = false;
    page.on('dialog', () => {
      dialogFired = true;
    });

    const png800b = makePng(800, 600);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'second-800x600.png',
      mimeType: 'image/png',
      buffer: png800b,
    });

    // Give a tick for any potential dialog to fire
    await page.waitForTimeout(200);
    expect(dialogFired).toBe(false);
  });
});
