// ============================================================
// File:        JoinPage.jsx
// Path:        client/src/screens/Join/JoinPage.jsx
// Project:     RaceArena — REGISTRATION-1 (the owner's decisions of 2026-10-20)
// Description: The PUBLIC join page, /join/<code> — the page behind a registration's link and QR
//              code. A player at the venue opens it on a phone, sees the event, the track, the places
//              left and a live countdown, types a name and presses Join. No sign-in: App.jsx mounts it
//              outside ProtectedRoute, and the server's `/api/join/<code>` is public
//              (server/src/routes/join.js).
//
// ── WHAT IT SHOWS, BY STATE ────────────────────────────────────────────────────────────────────
//   registered on this device  "You're in! You are number N of M." — also on every revisit, because
//                              the server recognises the device by its cookie and says so in `you`
//   open, places left          the name field and Join
//   full                       "This race is full."
//   closed                     "Registration is closed."
//   unknown code               "This registration link is not valid."
// The server decides every one of them; this page renders its answer and never guesses. After any
// refusal it asks again, so a page that was open while the last place went shows "full" at once.
//
// ── POLLING, NOT A NEW TRANSPORT ───────────────────────────────────────────────────────────────
// The countdown ticks every second from this device's clock; the page asks the server again every
// 10 s for places left and the state, and once more when the countdown reaches zero.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LegalFooter from '../../components/LegalFooter/LegalFooter.jsx';
import { fetchJoinInfo, joinRegistration } from '../../services/registrationApi.js';
import { formatTimeLeft, msUntil } from '../../modules/registration/timeLeft.js';
// NAME-LIMIT-1's one home: the field stops at the same length the server refuses beyond.
import { PLAYER_NAME_MAX_LENGTH } from '../../../../shared/nameLimits.mjs';
import styles from './JoinPage.module.css';

const POLL_MS = 10 * 1000;

/** The sentence for a failed request: the server's own, or "could not reach" when none came. */
function sentenceFor(err) {
  return err?.status
    ? err.message
    : 'The server could not be reached. Check your connection and try again.';
}

export default function JoinPage() {
  const { code } = useParams();
  const [info, setInfo] = useState(null); // null while the first answer is on its way
  const [loadError, setLoadError] = useState(null); // { unknown: boolean, text: string }
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setInfo(await fetchJoinInfo(code));
      setLoadError(null);
    } catch (err) {
      setLoadError({
        unknown: err?.status === 404,
        text: err?.status === 404 ? 'This registration link is not valid.' : sentenceFor(err),
      });
    }
  }, [code]);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const left = info ? msUntil(info.closesAt, now) : 0;
  const isOpen = info?.state === 'open' && left > 0;

  // The countdown reached zero on this device: ask the server, whose clock decides.
  useEffect(() => {
    if (info?.state === 'open' && left === 0) load();
  }, [info?.state, left, load]);

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setRefusal('');
    try {
      const { you } = await joinRegistration(code, name);
      setInfo((prev) => (prev ? { ...prev, you } : prev));
      setName('');
    } catch (err) {
      setRefusal(sentenceFor(err));
    } finally {
      setBusy(false);
      load();
    }
  }

  let body;
  if (loadError?.unknown) {
    body = <p className={styles.notice}>{loadError.text}</p>;
  } else if (!info) {
    body = <p className={styles.muted}>{loadError ? loadError.text : 'Loading…'}</p>;
  } else if (info.you) {
    body = (
      <div className={styles.success} data-testid="join-success">
        <p className={styles.successLine}>{info.you.message}</p>
        <p className={styles.muted}>Registered as {info.you.name}.</p>
      </div>
    );
  } else if (!isOpen) {
    body = <p className={styles.notice}>Registration is closed.</p>;
  } else if (info.placesLeft <= 0) {
    body = <p className={styles.notice}>This race is full.</p>;
  } else {
    body = (
      <form className={styles.form} onSubmit={handleJoin}>
        <label className={styles.label} htmlFor="join-name">
          Your name
        </label>
        <input
          id="join-name"
          className={styles.input}
          type="text"
          autoComplete="nickname"
          maxLength={PLAYER_NAME_MAX_LENGTH}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (refusal) setRefusal('');
          }}
        />
        <button className={styles.join} type="submit" disabled={!name.trim() || busy}>
          {busy ? 'Joining…' : 'Join'}
        </button>
      </form>
    );
  }

  return (
    <div className={styles.screen}>
      <main className={styles.page}>
        <h1 className={styles.title}>{info?.eventName || 'Race registration'}</h1>
        {info && (
          <dl className={styles.facts}>
            <div>
              <dt>Track</dt>
              <dd>{info.trackName}</dd>
            </div>
            <div>
              <dt>Places left</dt>
              <dd data-testid="join-places-left">
                {info.placesLeft} of {info.capacity}
              </dd>
            </div>
            <div>
              <dt>Time left</dt>
              <dd data-testid="join-time-left">{formatTimeLeft(isOpen ? left : 0)}</dd>
            </div>
          </dl>
        )}
        {body}
        {refusal && (
          <p role="alert" className={styles.refusal} data-testid="join-refusal">
            {refusal}
          </p>
        )}
        {loadError && info && !loadError.unknown && (
          <p className={styles.muted}>{loadError.text}</p>
        )}
      </main>
      <LegalFooter />
    </div>
  );
}
