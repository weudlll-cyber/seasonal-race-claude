// ============================================================
// File:        LegalPage.website.test.jsx
// Path:        client/src/screens/Legal/LegalPage.website.test.jsx
// Project:     RaceArena — GOING-ONLINE-PREP-1 piece 2 (the owner's decision D3 of 2026-11-13)
// Created:     2026-11-13
// Description: The race's own /legal-notice and /privacy in BOTH modes. Website mode: the address
//              is REPLACED with the website's page (/info/imprint, /info/privacy) and the race's own
//              text is never drawn. Standalone: the operator's text as before, and no redirect.
//              LegalPage.test.jsx (unchanged) pins the standalone page in detail. The page reads the
//              mode from the server's runtime marker at import, so the marker is set before the
//              module loads.
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let pages = null;
vi.mock('../../modules/legal/useLegalPages.js', () => ({ useLegalPages: () => pages }));

const WEBSITE = { apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' };
const replace = vi.fn();
const realLocation = window.location;

async function renderWith(marker, kind) {
  vi.resetModules();
  if (marker) globalThis.__RA_RUNTIME_CONFIG__ = marker;
  const { default: LegalPage } = await import('./LegalPage.jsx');
  render(
    <MemoryRouter>
      <LegalPage kind={kind} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  pages = { legalNotice: 'OUR NOTICE', privacyPolicy: 'OUR POLICY', sourceUrl: null };
  replace.mockReset();
  // jsdom's location cannot navigate; a stand-in records where the page sends the visitor.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, replace },
  });
});

afterEach(() => {
  delete globalThis.__RA_RUNTIME_CONFIG__;
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('website mode — the race’s legal routes send the visitor to the website (D3)', () => {
  it.each([
    ['legalNotice', '/info/imprint'],
    ['privacyPolicy', '/info/privacy'],
  ])('%s replaces the address with %s', async (kind, target) => {
    await renderWith(WEBSITE, kind);
    expect(replace).toHaveBeenCalledWith(target);
    // The fallback link, for the moment before the replace.
    expect(screen.getByRole('link').getAttribute('href')).toBe(target);
  });

  it('never draws the race’s own text', async () => {
    await renderWith(WEBSITE, 'legalNotice');
    expect(screen.queryByText('OUR NOTICE')).toBeNull();
  });
});

describe('★ standalone — the operator’s own page, unchanged', () => {
  it.each([
    ['legalNotice', 'OUR NOTICE'],
    ['privacyPolicy', 'OUR POLICY'],
  ])('%s shows the race’s own text and sends nobody anywhere', async (kind, text) => {
    await renderWith(null, kind);
    expect(screen.getByTestId('legal-text').textContent).toBe(text);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: '← Back' }).getAttribute('href')).toBe('/');
  });
});
