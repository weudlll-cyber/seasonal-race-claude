// ============================================================
// File:        LegalPagesSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/LegalPagesSection.test.jsx
// Project:     RaceArena — LEGAL-PAGES-1, PRIVACY-TEMPLATE-1
// Description: The Dev Screen's "Legal pages" section: it shows the stored texts; each field's
//              "Insert template" (the legal notice's, and since 2026-10-18 the privacy policy's)
//              fills an empty field with its template, ASKS before replacing text, and never saves
//              by itself — the same three tests run for both buttons; Save stores both texts.
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
const { LEGAL_NOTICE_TEMPLATE, PRIVACY_POLICY_TEMPLATE } =
  await import('../../../modules/legal/legalNoticeTemplate.js');

const stored = (over) => ({
  legalNotice: '',
  privacyPolicy: '',
  maxChars: 20000,
  sourceUrl: null,
  ...over,
});

/** Renders the section with the server's answer and returns the field `textId` once loaded. */
async function renderSection(answer, textId = 'legal-notice-text') {
  fetchLegalPages.mockResolvedValue(answer);
  render(<LegalPagesSection />);
  const field = screen.getByTestId(textId);
  await waitFor(() => expect(field.disabled).toBe(false));
  return field;
}

/** The two fields with a template, and what each test needs to know about them. */
const TEMPLATE_FIELDS = [
  {
    name: 'legal notice',
    key: 'legalNotice',
    textId: 'legal-notice-text',
    buttonId: 'legal-notice-template',
    template: LEGAL_NOTICE_TEMPLATE,
  },
  {
    name: 'privacy policy',
    key: 'privacyPolicy',
    textId: 'privacy-policy-text',
    buttonId: 'privacy-policy-template',
    template: PRIVACY_POLICY_TEMPLATE,
  },
];

beforeEach(() => {
  fetchLegalPages.mockReset();
  saveLegalPages.mockReset();
  vi.spyOn(window, 'confirm');
});
afterEach(() => vi.restoreAllMocks());

describe.each(TEMPLATE_FIELDS)('Insert template — $name', (f) => {
  it('fills an EMPTY field with the template, without asking and without saving', async () => {
    const field = await renderSection(stored(), f.textId);
    fireEvent.click(screen.getByTestId(f.buttonId));
    expect(field.value).toBe(f.template);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(saveLegalPages).not.toHaveBeenCalled();
  });

  it('asks before replacing a filled field — and keeps the text when the answer is no', async () => {
    window.confirm.mockReturnValue(false);
    const field = await renderSection(stored({ [f.key]: 'My own text' }), f.textId);
    expect(field.value).toBe('My own text');
    fireEvent.click(screen.getByTestId(f.buttonId));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm.mock.calls[0][0]).toContain(f.name);
    expect(field.value).toBe('My own text');
  });

  it('replaces a filled field when the answer is yes — still without saving', async () => {
    window.confirm.mockReturnValue(true);
    const field = await renderSection(stored({ [f.key]: 'My own text' }), f.textId);
    fireEvent.click(screen.getByTestId(f.buttonId));
    expect(field.value).toBe(f.template);
    expect(saveLegalPages).not.toHaveBeenCalled();
  });

  it('fills only its own field', async () => {
    await renderSection(stored());
    fireEvent.click(screen.getByTestId(f.buttonId));
    for (const other of TEMPLATE_FIELDS.filter((o) => o !== f)) {
      expect(screen.getByTestId(other.textId).value).toBe('');
    }
  });
});

describe('The templates', () => {
  it('the legal notice is English, country-neutral, and keeps its line breaks', () => {
    expect(LEGAL_NOTICE_TEMPLATE.startsWith('LEGAL NOTICE\n\nOperator\n')).toBe(true);
    expect(LEGAL_NOTICE_TEMPLATE).toContain('\n[Country]\n');
    expect(LEGAL_NOTICE_TEMPLATE.endsWith('Check what applies to you.')).toBe(true);
  });

  it('the privacy policy is English, country-neutral, and keeps its line breaks', () => {
    expect(PRIVACY_POLICY_TEMPLATE.startsWith('PRIVACY POLICY\n\nWho is responsible\n')).toBe(true);
    expect(PRIVACY_POLICY_TEMPLATE).toContain('\nContact: [contact@your-domain]\n');
    expect(
      PRIVACY_POLICY_TEMPLATE.endsWith('remove anything that does not match your installation.')
    ).toBe(true);
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
