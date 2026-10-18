// ============================================================
// File:        LegalPage.test.jsx
// Path:        client/src/screens/Legal/LegalPage.test.jsx
// Project:     RaceArena — LEGAL-PAGES-1
// Description: The public legal pages show the operator's text as PLAIN TEXT: line breaks kept,
//              markup shown as typed and never rendered; a heading and a way back; and an honest line
//              when there is no text or the server could not be asked.
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let pages = null;
vi.mock('../../modules/legal/useLegalPages.js', async (importOriginal) => ({
  ...(await importOriginal()),
  useLegalPages: () => pages,
}));

const { default: LegalPage } = await import('./LegalPage.jsx');
const { EMPTY_LEGAL_PAGES } = await import('../../modules/legal/useLegalPages.js');

const answer = (over) => ({ legalNotice: '', privacyPolicy: '', sourceUrl: null, ...over });

function renderPage(kind) {
  render(
    <MemoryRouter>
      <LegalPage kind={kind} />
    </MemoryRouter>
  );
  return screen.getByTestId('legal-text');
}

beforeEach(() => {
  pages = null;
});

describe('the operator’s text, as plain text', () => {
  it('keeps every line break, and the element preserves them on screen', () => {
    const text = 'LEGAL NOTICE\n\nOperator\n  Jane Doe\n\n\nEnd';
    pages = answer({ legalNotice: text });
    const el = renderPage('legalNotice');
    expect(el.textContent).toBe(text);
    expect(getComputedStyle(el).whiteSpace).toBe('pre-wrap');
  });

  it('shows markup as typed and renders none of it', () => {
    pages = answer({ privacyPolicy: '<b>x</b><img src=x onerror="alert(1)">' });
    const el = renderPage('privacyPolicy');
    expect(el.textContent).toBe('<b>x</b><img src=x onerror="alert(1)">');
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });

  it('has its heading and a way back', () => {
    pages = answer({ legalNotice: 'N' });
    renderPage('legalNotice');
    expect(screen.getByRole('heading', { name: 'Legal notice' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '← Back' }).getAttribute('href')).toBe('/');
  });

  it('each page shows its own text', () => {
    pages = answer({ legalNotice: 'NOTICE', privacyPolicy: 'PRIVACY' });
    expect(renderPage('privacyPolicy').textContent).toBe('PRIVACY');
    expect(screen.getByRole('heading', { name: 'Privacy policy' })).toBeTruthy();
  });
});

describe('when there is no text', () => {
  it('says the operator has not provided it', () => {
    pages = answer({});
    expect(renderPage('legalNotice').textContent).toMatch(/has not provided this page/);
  });

  it('says the text could not be loaded when the server gave no answer', () => {
    pages = EMPTY_LEGAL_PAGES;
    expect(renderPage('legalNotice').textContent).toMatch(/could not be loaded/);
  });
});
