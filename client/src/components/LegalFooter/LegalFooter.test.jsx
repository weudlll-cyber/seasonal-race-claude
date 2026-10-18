// ============================================================
// File:        LegalFooter.test.jsx
// Path:        client/src/components/LegalFooter/LegalFooter.test.jsx
// Project:     RaceArena — LEGAL-PAGES-1
// Description: The legal footer: "Source code" always, pointing at the running build's commit, at
//              the operator's RA_SOURCE_URL when set, and at the repository root (said on the link)
//              when the build names no commit; "Legal notice" and "Privacy policy" only when the
//              operator filled them in. The server's answer is injected through the hook.
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const build = { commit: 'abc1234', branch: 'master', dirty: false };
vi.mock('virtual:ra-build', () => ({ default: build }));

let pages = null;
vi.mock('../../modules/legal/useLegalPages.js', () => ({ useLegalPages: () => pages }));

const { default: LegalFooter, INEXACT_SOURCE_NOTE } = await import('./LegalFooter.jsx');
const { REPOSITORY_URL, sourceCodeUrl } = await import('../../modules/legal/sourceCodeUrl.js');

const answer = (over = {}) => ({
  legalNotice: '',
  privacyPolicy: '',
  maxChars: 20000,
  sourceUrl: null,
  ...over,
});

function renderFooter() {
  render(
    <MemoryRouter>
      <LegalFooter />
    </MemoryRouter>
  );
  return screen.getByRole('link', { name: 'Source code' });
}

beforeEach(() => {
  pages = null;
  Object.assign(build, { commit: 'abc1234', dirty: false });
});

describe('Source code — always there', () => {
  it('links to the repository at the running build’s commit, in a new tab', () => {
    pages = answer();
    const link = renderFooter();
    expect(link.getAttribute('href')).toBe(`${REPOSITORY_URL}/tree/abc1234`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('title')).toBeNull();
  });

  it('is there before the server answered, and when it never answers', () => {
    pages = null;
    expect(renderFooter().getAttribute('href')).toBe(`${REPOSITORY_URL}/tree/abc1234`);
  });

  it('follows the operator’s RA_SOURCE_URL when the server sends one', () => {
    pages = answer({ sourceUrl: 'https://example.org/fork' });
    expect(renderFooter().getAttribute('href')).toBe('https://example.org/fork');
  });

  it.each([
    ['an unknown build', { commit: 'unknown', dirty: false }],
    ['a dirty build', { commit: 'abc1234', dirty: true }],
  ])('%s links to the repository root, and says so', (_name, stamp) => {
    Object.assign(build, stamp);
    pages = answer();
    const link = renderFooter();
    expect(link.getAttribute('href')).toBe(REPOSITORY_URL);
    expect(link.getAttribute('title')).toBe(INEXACT_SOURCE_NOTE);
  });

  it('sourceCodeUrl: a blank override is no override', () => {
    expect(sourceCodeUrl({ override: '  ', build: { commit: 'abc1234' } }).href).toBe(
      `${REPOSITORY_URL}/tree/abc1234`
    );
  });
});

describe('Legal notice and Privacy policy — only when filled in', () => {
  it('both hidden when the operator left them empty (or only blank)', () => {
    pages = answer({ legalNotice: '   \n ' });
    renderFooter();
    expect(screen.queryByRole('link', { name: 'Legal notice' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Privacy policy' })).toBeNull();
  });

  it('each shown when filled in, linking to its public page', () => {
    pages = answer({ legalNotice: 'N', privacyPolicy: 'P' });
    renderFooter();
    expect(screen.getByRole('link', { name: 'Legal notice' }).getAttribute('href')).toBe(
      '/legal-notice'
    );
    expect(screen.getByRole('link', { name: 'Privacy policy' }).getAttribute('href')).toBe(
      '/privacy'
    );
  });

  it('one without the other', () => {
    pages = answer({ privacyPolicy: 'P' });
    renderFooter();
    expect(screen.queryByRole('link', { name: 'Legal notice' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toBeTruthy();
  });
});
