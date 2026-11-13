// ============================================================
// File:        LegalFooter.website.test.jsx
// Path:        client/src/components/LegalFooter/LegalFooter.website.test.jsx
// Project:     RaceArena — GOING-ONLINE-PREP-1 piece 2 (the owner's decision D3 of 2026-11-13)
// Created:     2026-11-13
// Description: The legal footer in BOTH modes. Website mode: "Legal notice" and "Privacy policy"
//              always show and open the website's own pages at the origin's root, whatever the
//              race's operator texts say. Standalone: the race's own pages, only when filled in —
//              exactly as LegalFooter.test.jsx (unchanged) pins them. The footer reads the mode from
//              the server's runtime marker at import, so the marker is set before the module loads
//              (the pattern of screens/Auth/LoginScreen.website.test.jsx).
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('virtual:ra-build', () => ({
  default: { commit: 'abc1234', branch: 'master', dirty: false },
}));

let pages = null;
vi.mock('../../modules/legal/useLegalPages.js', () => ({ useLegalPages: () => pages }));

const WEBSITE = { apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' };

async function renderWith(marker, answer) {
  vi.resetModules();
  pages = answer;
  if (marker) globalThis.__RA_RUNTIME_CONFIG__ = marker;
  const { default: LegalFooter } = await import('./LegalFooter.jsx');
  render(
    // The race's router has the base path as its basename in website mode (App.jsx); a router
    // link here would come out as "/games/race/…", which is what the plain links must avoid.
    <MemoryRouter basename={marker?.basePath} initialEntries={[`${marker?.basePath ?? ''}/setup`]}>
      <LegalFooter />
    </MemoryRouter>
  );
}

const hrefOf = (name) => screen.getByRole('link', { name }).getAttribute('href');

afterEach(() => {
  delete globalThis.__RA_RUNTIME_CONFIG__;
});

describe('LegalFooter in website mode — the website’s legal pages (D3)', () => {
  it('links "Legal notice" and "Privacy policy" to the website’s pages at the origin’s root', async () => {
    await renderWith(WEBSITE, { legalNotice: '', privacyPolicy: '', sourceUrl: null });
    expect(hrefOf('Legal notice')).toBe('/info/imprint');
    expect(hrefOf('Privacy policy')).toBe('/info/privacy');
  });

  it('shows them before the server answered, and when the race’s own texts are filled in', async () => {
    await renderWith(WEBSITE, null);
    expect(hrefOf('Legal notice')).toBe('/info/imprint');
    expect(hrefOf('Privacy policy')).toBe('/info/privacy');
  });

  it('never offers the race’s own /legal-notice or /privacy', async () => {
    await renderWith(WEBSITE, { legalNotice: 'Ours', privacyPolicy: 'Ours', sourceUrl: null });
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    // Neither the plain own paths nor the router form under the base path.
    for (const own of ['/legal-notice', '/privacy']) {
      expect(hrefs).not.toContain(own);
      expect(hrefs).not.toContain(`${WEBSITE.basePath}${own}`);
    }
    expect(hrefs).toContain('/info/imprint');
  });

  it('keeps "Source code"', async () => {
    await renderWith(WEBSITE, null);
    expect(hrefOf('Source code')).toMatch(/\/tree\/abc1234$/);
  });
});

describe('★ LegalFooter standalone — unchanged', () => {
  it('links the race’s own pages when the operator filled them in', async () => {
    await renderWith(null, { legalNotice: 'Ours', privacyPolicy: 'Ours', sourceUrl: null });
    expect(hrefOf('Legal notice')).toBe('/legal-notice');
    expect(hrefOf('Privacy policy')).toBe('/privacy');
  });

  it('shows neither link when the texts are empty, and never a website page', async () => {
    await renderWith(null, { legalNotice: '', privacyPolicy: '', sourceUrl: null });
    expect(screen.queryByRole('link', { name: 'Legal notice' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Privacy policy' })).toBeNull();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs.some((h) => h.startsWith('/info/'))).toBe(false);
  });
});
