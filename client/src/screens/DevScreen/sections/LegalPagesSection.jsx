// ============================================================
// File:        LegalPagesSection.jsx
// Path:        client/src/screens/DevScreen/sections/LegalPagesSection.jsx
// Project:     RaceArena — LEGAL-PAGES-1 (the owner's decision of 2026-10-18)
// Description: THE OPERATOR'S LEGAL PAGES — the legal notice and the privacy policy this install
//              shows at /legal-notice and /privacy, edited in the Dev Screen chapter "Accounts and
//              system". Admins only, like the test-aids switch: the part is advanced tier (the All
//              view, which only an admin has), and the server refuses anyone else's change
//              (`ROUTE_POLICY`, server/src/auth/guards.js).
//
// The texts live on the server (`legal-pages.json` in its data root); this section reads them from
// the public `GET /api/settings/legal-pages` and stores both with one Save. "Insert template" fills
// the legal-notice field with the one template (modules/legal/legalNoticeTemplate.js), asking first
// when the field already holds text, and does NOT save — the operator edits, then saves.
// ============================================================

import { useEffect, useState } from 'react';
import { fetchLegalPages, saveLegalPages } from '../../../services/legalPagesApi.js';
import { LEGAL_NOTICE_TEMPLATE } from '../../../modules/legal/legalNoticeTemplate.js';
import { Ctl, Info } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

const ID = {
  notice: 'LegalPagesSection:legal-notice-text',
  template: 'LegalPagesSection:legal-notice-template',
  privacy: 'LegalPagesSection:privacy-policy-text',
  save: 'LegalPagesSection:legal-pages-save',
};

const REPLACE_QUESTION = 'Replace the text in the legal notice field with the template?';

/**
 * A text field's frame: its label with the info icon, and a character count against the server's
 * bound. The <textarea> itself is written at each use with its literal data-testid, so the Dev
 * Screen's control count (reports/evolution/DEVSCREEN-CHAPTERS-1/count-controls.mjs) sees two.
 */
function TextField({ id, htmlId, label, length, maxChars, children }) {
  return (
    <div className={s.formGroup} data-control-id={id} style={{ marginBottom: '0.75rem' }}>
      <label className={s.label} htmlFor={htmlId}>
        {label} <Info id={id} />
      </label>
      {children}
      <div className={s.sectionDesc}>
        {length}
        {maxChars ? ` of ${maxChars}` : ''} characters
      </div>
    </div>
  );
}

/** The props both textareas share. */
const textareaProps = (maxChars, disabled) => ({
  className: s.textarea,
  style: { minHeight: '10rem' },
  maxLength: maxChars ?? undefined,
  disabled,
});

function LegalPagesSection() {
  const [notice, setNotice] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [maxChars, setMaxChars] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLegalPages()
      .then((p) => {
        if (cancelled) return;
        setNotice(p.legalNotice ?? '');
        setPrivacy(p.privacyPolicy ?? '');
        setMaxChars(p.maxChars ?? null);
        setLoaded(true);
      })
      .catch(
        () => !cancelled && setMessage('The legal pages could not be loaded from the server.')
      );
    return () => {
      cancelled = true;
    };
  }, []);

  function insertTemplate() {
    // Asks before replacing text — the same window.confirm the other Dev Screen sections use.
    if (notice.trim() !== '' && !window.confirm(REPLACE_QUESTION)) return;
    setNotice(LEGAL_NOTICE_TEMPLATE);
    setMessage('Template inserted. Replace the bracketed fields, then save.');
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const stored = await saveLegalPages({ legalNotice: notice, privacyPolicy: privacy });
      setNotice(stored.legalNotice);
      setPrivacy(stored.privacyPolicy);
      setMessage('Saved. The pages show the new text now.');
    } catch (err) {
      setMessage(`The server did not store the change: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.card}>
      <TextField
        id={ID.notice}
        htmlId="legal-notice-text"
        label="Legal notice"
        length={notice.length}
        maxChars={maxChars}
      >
        <textarea
          id="legal-notice-text"
          data-testid="legal-notice-text"
          {...textareaProps(maxChars, !loaded || busy)}
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
        />
      </TextField>
      <div className={s.btnRow} style={{ marginBottom: '1.25rem' }}>
        <Ctl id={ID.template}>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost}`}
            data-testid="legal-notice-template"
            disabled={!loaded || busy}
            onClick={insertTemplate}
          >
            Insert template
          </button>
        </Ctl>
      </div>
      <TextField
        id={ID.privacy}
        htmlId="privacy-policy-text"
        label="Privacy policy"
        length={privacy.length}
        maxChars={maxChars}
      >
        <textarea
          id="privacy-policy-text"
          data-testid="privacy-policy-text"
          {...textareaProps(maxChars, !loaded || busy)}
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
        />
      </TextField>
      <div className={s.btnRow}>
        <Ctl id={ID.save}>
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            data-testid="legal-pages-save"
            disabled={!loaded || busy}
            onClick={save}
          >
            {busy ? 'Saving…' : 'Save legal pages'}
          </button>
        </Ctl>
      </div>
      {message && (
        <p className={s.sectionDesc} role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default LegalPagesSection;
