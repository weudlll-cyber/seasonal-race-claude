// ============================================================
// File:        BrandLogoOverlay.test.jsx
// Path:        client/src/screens/RaceScreen/BrandLogoOverlay.test.jsx
// Project:     RaceArena — BRAND-LOGO-SCALE-1
// Created:     2026-10-13
// Description: The in-race corner logo is sized to the race picture: today's size on every desktop
//              picture, proportionally smaller on a phone, with its corner and margin anchored in
//              percentages of the picture so they shrink with it.
//
//              The picture sizes are the ones measured in Chromium on 2026-10-13 (`clientWidth` x
//              `clientHeight` of `.race-canvas-wrapper`): 1676x943 at a 1920 px window, 1036x582 at
//              a 1280 px window, 368x207 at a 390 px window (iPhone 12 Pro width).
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import {
  brandLogoMaxHeightPx,
  DEFAULT_LOGO_MAX_HEIGHT,
  FULL_SIZE_SHORT_SIDE_CSS_PX,
} from './brandLogoSize.js';

let mockProfile = null;
vi.mock('../../modules/branding/useActiveBrandProfile.js', () => ({
  useActiveBrandProfile: () => mockProfile,
}));

// Imported after the mock is registered (vi.mock is hoisted, this keeps the order readable).
import BrandLogoOverlay from './BrandLogoOverlay.jsx';

const DESKTOP_PICTURES = [
  { name: '1920 window', w: 1676, h: 943 },
  { name: '1280 window', w: 1036, h: 582 },
  { name: '1280 window with a scrollbar', w: 1021, h: 574 },
  { name: 'canvas 1:1', w: 1280, h: 720 },
];
const PHONE_PICTURE = { name: '390 window', w: 368, h: 207 };
// The profile editor's slider range, and the default.
const LOGO_HEIGHTS = [40, 90, 160];

describe('brandLogoMaxHeightPx — the size rule', () => {
  it('a desktop picture keeps EXACTLY today’s size, for every logo height the editor offers', () => {
    for (const p of DESKTOP_PICTURES) {
      for (const cap of LOGO_HEIGHTS) {
        expect(brandLogoMaxHeightPx(cap, p.w, p.h), `${cap} px logo, ${p.name}`).toBe(cap);
      }
    }
  });

  it('a 390 px phone picture gets a proportionally smaller logo — one sixth of its height', () => {
    const px = brandLogoMaxHeightPx(90, PHONE_PICTURE.w, PHONE_PICTURE.h);
    expect(px).toBeCloseTo((90 * 207) / 540, 6); // 34.5 px, was 90
    expect(px / PHONE_PICTURE.h).toBeCloseTo(1 / 6, 6);
    expect(px).toBeLessThan(90);
  });

  it('below full size the logo scales with the picture’s SHORTER side, linearly', () => {
    const half = FULL_SIZE_SHORT_SIDE_CSS_PX / 2;
    expect(brandLogoMaxHeightPx(120, 2000, half)).toBeCloseTo(60, 6); // landscape: the height
    expect(brandLogoMaxHeightPx(120, half, 2000)).toBeCloseTo(60, 6); // portrait: the width
  });

  it('an unmeasured picture, or a profile with no height, falls back to today’s behaviour', () => {
    expect(brandLogoMaxHeightPx(90, null, null)).toBe(90);
    expect(brandLogoMaxHeightPx(90, 0, 0)).toBe(90);
    expect(brandLogoMaxHeightPx(undefined, 1280, 720)).toBe(DEFAULT_LOGO_MAX_HEIGHT);
  });
});

describe('BrandLogoOverlay — the rendered logo, corner and margin', () => {
  const restore = [];
  afterEach(() => {
    cleanup();
    while (restore.length) restore.pop()();
    mockProfile = null;
  });

  /** jsdom has no layout: give the picture (the overlay's parent) the measured CSS size. */
  function stubPicture({ w, h }) {
    for (const [prop, value] of [
      ['clientWidth', w],
      ['clientHeight', h],
    ]) {
      const original = Object.getOwnPropertyDescriptor(Element.prototype, prop);
      Object.defineProperty(Element.prototype, prop, {
        configurable: true,
        get() {
          return this.classList?.contains('race-canvas-wrapper') ? value : 0;
        },
      });
      restore.push(() => Object.defineProperty(Element.prototype, prop, original));
    }
  }

  function renderIn(picture, profile) {
    stubPicture(picture);
    mockProfile = { logo: '/logo.png', eventName: 'Event', ...profile };
    const { container } = render(
      <div className="race-canvas-wrapper">
        <BrandLogoOverlay />
      </div>
    );
    return {
      box: container.querySelector('.brand-logo-overlay'),
      img: container.querySelector('.brand-logo-overlay__img'),
    };
  }

  it('on a desktop picture the logo is drawn at the profile’s height, as before', () => {
    const { img } = renderIn(DESKTOP_PICTURES[1], { logoMaxHeight: 90 });
    expect(img.style.maxHeight).toBe('90px');
  });

  it('on a phone picture the logo is below the cap', () => {
    const { img } = renderIn(PHONE_PICTURE, { logoMaxHeight: 90 });
    expect(parseFloat(img.style.maxHeight)).toBeCloseTo(34.5, 6);
  });

  /** A `calc(N%)` offset as a fraction of the picture side it is measured against. */
  const percentOf = (value) => {
    const m = /^calc\(([\d.]+)%\)$/.exec(value);
    expect(m, `offset ${value} is not a percentage of the picture`).toBeTruthy();
    return Number(m[1]) / 100;
  };

  it('the corner and margin are percentages of the picture — proportional at every size', () => {
    // bottom-right (the default): 16 canvas px from each edge, i.e. 16/1280 of the width and 16/720
    // of the height — on the phone picture 4.6 x 4.6 CSS px, on the 1280-window picture 12.95.
    const br = renderIn(PHONE_PICTURE, {}).box.style;
    expect(percentOf(br.right)).toBeCloseTo(16 / 1280, 5);
    expect(percentOf(br.bottom)).toBeCloseTo(16 / 720, 5);
    expect(br.top).toBe('auto');
    cleanup();
    const tr = renderIn(PHONE_PICTURE, { logoCorner: 'top-right' }).box.style;
    expect(percentOf(tr.right)).toBeCloseTo(16 / 1280, 5);
    expect(percentOf(tr.top)).toBeCloseTo(16 / 720, 5);
    expect(tr.bottom).toBe('auto');
  });
});
