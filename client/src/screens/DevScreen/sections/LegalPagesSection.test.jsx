// ============================================================
// File:        LegalPagesSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/LegalPagesSection.test.jsx
// Project:     RaceArena — LEGAL-PAGES-1
// Description: The Dev Screen's "Legal pages" section: it shows the stored texts, "Insert template"
//              fills an empty legal-notice field with the one template, ASKS before replacing text,
//              and never saves by itself; Save stores both texts.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchLegalPages = vi.fn();
const saveLegalPages = vi.fn();
vi.mock('../../../services/legalPagesApi.js', () => ({
  fetchLegalPages: (...a) => fetchLegalPages(...a),
  saveLegalPages: (...a) => saveLegalPages(...a),
}));

const { default: LegalPagesSection } = await import('./LegalPagesSection.jsx');
const { LEGAL_NOTICE_TEMPLATE } = await import('../../../modules/legal/legalNoticeTemplate.js');

const stored = (over) => ({
  legalNotice: '',
  privacyPolicy: '',
  maxChars: 20000,
  sourceUrl: null,
  ...over,
});

async function renderSection(answer) {
  fetchLegalPages.mockResolvedValue(answer);
  render(<LegalPagesSection />);
  const notice = screen.getByTestId('legal-notice-text');
  await waitFor(() => expect(notice.disabled).toBe(false));
  return notice;
}

beforeEach(() => {
  fetchLegalPages.mockReset();
  saveLegalPages.mockReset();
  vi.spyOn(window, 'confirm');
});
afterEach(() => vi.restoreAllMocks());

describe('Insert template', () => {
  it('fills an EMPTY field with the template, without asking and without saving', async () => {
    const notice = await renderSection(stored());
    fireEvent.click(screen.getByTestId('legal-notice-template'));
    expect(notice.value).toBe(LEGAL_NOTICE_TEMPLATE);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(saveLegalPages).not.toHaveBeenCalled();
  });

  it('asks before replacing a filled field — and keeps the text when the answer is no', async () => {
    window.confirm.mockReturnValue(false);
    const notice = await renderSection(stored({ legalNotice: 'My own notice' }));
    expect(notice.value).toBe('My own notice');
    fireEvent.click(screen.getByTestId('legal-notice-template'));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(notice.value).toBe('My own notice');
  });

  it('replaces a filled field when the answer is yes — still without saving', async () => {
    window.confirm.mockReturnValue(true);
    const notice = await renderSection(stored({ legalNotice: 'My own notice' }));
    fireEvent.click(screen.getByTestId('legal-notice-template'));
    expect(notice.value).toBe(LEGAL_NOTICE_TEMPLATE);
    expect(saveLegalPages).not.toHaveBeenCalled();
  });

  it('the template is English, country-neutral, and keeps its line breaks', () => {
    expect(LEGAL_NOTICE_TEMPLATE.startsWith('LEGAL NOTICE\n\nOperator\n')).toBe(true);
    expect(LEGAL_NOTICE_TEMPLATE).toContain('\n[Country]\n');
    expect(LEGAL_NOTICE_TEMPLATE.endsWith('Check what applies to you.')).toBe(true);
  });
});

describe('Save', () => {
  it('stores both texts as typed, and shows what the server stored', async () => {
    saveLegalPages.mockImplementation(async (t) => stored(t));
    const notice = await renderSection(stored({ privacyPolicy: 'P' }));
    fireEvent.change(notice, { target: { value: 'Line 1\nLine 2' } });
    fireEvent.click(screen.getByTestId('legal-pages-save'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Saved/));
    expect(saveLegalPages).toHaveBeenCalledWith({
      legalNotice: 'Line 1\nLine 2',
      privacyPolicy: 'P',
    });
  });

  it('says so when the server refuses', async () => {
    saveLegalPages.mockRejectedValue(
      new Error('legalNotice must be text of at most 20000 characters')
    );
    await renderSection(stored());
    fireEvent.click(screen.getByTestId('legal-pages-save'));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/did not store the change/)
    );
  });
});
