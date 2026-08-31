// ============================================================
// File:        SeedRedeliveryNotice.jsx
// Path:        client/src/components/SeedRedeliveryNotice.jsx
// Project:     RaceArena — SEED-REDELIVERY-1
// Description: The banner that tells an operator their copy of a shipped record was replaced,
//              and which record it was.
//
//              WHY IT LIVES ON THE FIRST SCREEN BEHIND SIGN-IN rather than on the sign-in screen
//              itself — the design question this piece had to answer:
//                · The warning must PERSIST UNTIL DISMISSED, so dismissal is an act by a known
//                  person. On the sign-in screen anyone who can reach the port could clear a
//                  warning the operator never saw, which is the failure the requirement exists to
//                  prevent, in a new shape.
//                · "Every operator passes here" is true of this screen too: `/` redirects to
//                  /setup and ProtectedRoute means it cannot be reached without signing in. There
//                  is no way to use RaceArena without arriving here.
//                · Record names would otherwise be readable, unauthenticated, by anyone who can
//                  reach the port.
//
//              It renders NOTHING when there is nothing pending, and it fails silent: a warning
//              store that cannot be read must not put an error in front of an operator who is
//              trying to start a race.
// ============================================================

import { useEffect, useState } from 'react';
import { fetchSeedNotices, dismissSeedNotices } from '../services/seedNoticeApi.js';

export default function SeedRedeliveryNotice() {
  const [notices, setNotices] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSeedNotices()
      .then((list) => {
        if (alive) setNotices(list);
      })
      .catch(() => {
        // Offline, or the server is older than this client. Nothing to warn about that the
        // operator can act on, and an error banner here would be worse than silence.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!notices.length) return null;

  async function handleDismiss() {
    setBusy(true);
    try {
      await dismissSeedNotices();
      setNotices([]);
    } catch {
      // The dismissal did not land, so the banner stays — which is the correct outcome: the
      // install still owes this warning and will show it again on the next visit.
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      style={{
        margin: '0 0 1rem',
        padding: '0.9rem 1.1rem',
        border: '1px solid #b45309',
        borderLeft: '4px solid #f59e0b',
        borderRadius: '6px',
        background: 'rgba(245, 158, 11, 0.08)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', marginBottom: '0.35rem' }}>
          Updated records replaced your settings
        </strong>
        <p style={{ margin: '0 0 0.5rem', lineHeight: 1.45 }}>
          {notices.length === 1
            ? 'A newer version of this record was delivered. Your own settings for it were replaced in full.'
            : `Newer versions of ${notices.length} records were delivered. Your own settings for them were replaced in full.`}
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {notices.map((n) => (
            <li key={n.unit}>
              {n.kind} <strong>{n.name}</strong>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={handleDismiss} disabled={busy}>
        {busy ? 'Dismissing…' : 'Dismiss'}
      </button>
    </div>
  );
}
