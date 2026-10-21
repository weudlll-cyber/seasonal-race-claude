// ============================================================
// File:        RegistrationPanel.jsx
// Path:        client/src/screens/SetupScreen/RegistrationPanel.jsx
// Project:     RaceArena — REGISTRATION-1 (the owner's decisions of 2026-10-20)
// Description: The Players tab's second way to fill a race: "Player registration". The director
//              chooses a track, how long registration stays open and an optional event name; the
//              server opens it with the track's place count (server/src/routes/registrations.js).
//              Then this panel shows the join link with a copy button, a QR code with "Copy QR code"
//              and "Download QR", places taken and left, the time left, the live list with a remove
//              button per name, "Close now", "Extend", "Show QR full screen" and "Delete
//              registration". When it is closed, "Use these players" hands the names and the track to
//              the Setup screen, and the race is started through the normal Start Race flow —
//              nothing here starts a race.
//
// ── THE PLACE COUNT IS THE PLAYERS TAB'S OWN LIMIT ─────────────────────────────────────────────
// Computed for the chosen track exactly as the Players tab computes it for the selected one:
// `isTrackOpen` and `fieldCapFor` (fieldCap.js). Sent once, on creation; the server bounds it and
// holds it fixed, so a later change to the race defaults does not change an open registration.
//
// ── COMING BACK (follow-up 1, the owner's request of 2026-10-21) ───────────────────────────────
// The team's registrations are numbered cards, open ones first and highlighted. When any is open the
// list stands ABOVE the form, and on the panel's first load exactly one open registration is shown
// directly — so a director who reloads during a registration lands on it (SetupScreen.jsx opens the
// tab in this mode when one is open).
//
// ── LIVE BY POLLING ────────────────────────────────────────────────────────────────────────────
// While a registration is shown and open, it is asked for again every 5 s (no new transport); the
// countdown ticks every second from this device's clock, and the server's clock decides.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import QrCode from '../../components/QrCode/QrCode.jsx';
import QrShareButtons from '../../components/QrCode/QrShareButtons.jsx';
import {
  closeRegistration,
  createRegistration,
  deleteRegistration,
  extendRegistration,
  fetchRegistration,
  listRegistrations,
  removeRegistrationEntry,
} from '../../services/registrationApi.js';
import {
  deadlineProblem,
  formatDeadline,
  formatTimeLeft,
  msFromLocal,
  msUntil,
} from '../../modules/registration/timeLeft.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { fieldCapFor, isTrackOpen } from './fieldCap.js';
import DeadlineField from './DeadlineField.jsx';
import { useNow } from './useNow.js';
import styles from './RegistrationPanel.module.css';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long registration stays open: the presets of the owner's decisions, and a custom time. */
const DURATION_PRESETS = [
  { key: '1m', label: '1 min', ms: MINUTE },
  { key: '5m', label: '5 min', ms: 5 * MINUTE },
  { key: '15m', label: '15 min', ms: 15 * MINUTE },
  { key: '1h', label: '1 hour', ms: HOUR },
  { key: '1d', label: '1 day', ms: DAY },
  { key: '3d', label: '3 days', ms: 3 * DAY },
  { key: '7d', label: '7 days', ms: 7 * DAY },
];
/**
 * Added to every preset when it is sent. The server refuses a window under 1 minute counted from
 * when the request ARRIVES, so "1 min" sent as exactly 60 s from the click would always be refused
 * by the request's own travel time. Five seconds is invisible in every preset.
 */
const PRESET_GRACE_MS = 5 * 1000;
/** How much later "Extend" moves the deadline. */
const EXTEND_PRESETS = [
  { key: '+5m', label: '+5 min', ms: 5 * MINUTE },
  { key: '+15m', label: '+15 min', ms: 15 * MINUTE },
  { key: '+1h', label: '+1 hour', ms: HOUR },
  { key: '+1d', label: '+1 day', ms: DAY },
];
const POLL_MS = 5 * 1000;
/** How many CLOSED registrations the list shows; open ones are always all shown. */
const RECENT_CLOSED = 10;

/** The link a player opens: this app's own address, so it is right behind any proxy. */
function joinLinkFor(code) {
  return `${window.location.origin}/join/${code}`;
}

const errorText = (err) => err?.message || 'Something went wrong. Try again.';

/**
 * @param {{ tracks: object[], raceDefaults: object, selectedTrackId: string|null,
 *           onUsePlayers: (p: { names: string[], trackId: string }) => void }} props
 */
export default function RegistrationPanel({ tracks, raceDefaults, selectedTrackId, onUsePlayers }) {
  const [list, setList] = useState(null);
  const [shown, setShown] = useState(null); // the registration open in the panel, with its names
  const [error, setError] = useState('');
  const now = useNow();
  const firstLoad = useRef(true);

  const refreshList = useCallback(async () => {
    try {
      const next = await listRegistrations();
      setList(next);
      // The panel's first load: exactly one open registration is shown directly.
      if (firstLoad.current) {
        firstLoad.current = false;
        const open = next.filter((r) => r.state === 'open');
        if (open.length === 1) setShown(await fetchRegistration(open[0].id));
      }
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Poll the shown registration while it is open.
  const shownId = shown?.id ?? null;
  const shownOpen = shown?.state === 'open';
  useEffect(() => {
    if (!shownId || !shownOpen) return undefined;
    const poll = setInterval(async () => {
      try {
        setShown(await fetchRegistration(shownId));
      } catch (err) {
        setError(errorText(err));
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [shownId, shownOpen]);

  // The countdown reached zero here: ask the server, whose clock decides.
  const left = shown ? msUntil(shown.closesAt, now) : 0;
  useEffect(() => {
    if (shownId && shownOpen && left === 0) fetchRegistration(shownId).then(setShown, () => {});
  }, [shownId, shownOpen, left]);

  async function act(fn) {
    setError('');
    try {
      const next = await fn();
      if (next) setShown(next);
      refreshList();
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (shown) {
    return (
      <RegistrationView
        registration={shown}
        timeLeft={shown.state === 'open' ? left : 0}
        now={now}
        error={error}
        onBack={() => {
          setShown(null);
          setError('');
          refreshList();
        }}
        onClose={() => act(() => closeRegistration(shown.id))}
        onExtend={(closesAt) => act(() => extendRegistration(shown.id, closesAt))}
        onRemove={(entryId) => act(() => removeRegistrationEntry(shown.id, entryId))}
        onDelete={() =>
          act(async () => {
            await deleteRegistration(shown.id);
            setShown(null);
            return null;
          })
        }
        onUsePlayers={() =>
          onUsePlayers({ names: shown.entries.map((e) => e.name), trackId: shown.trackId })
        }
      />
    );
  }

  const anyOpen = (list ?? []).some((r) => r.state === 'open');
  const listBlock = (
    <RegistrationList list={list} now={now} onShow={(id) => act(() => fetchRegistration(id))} />
  );
  return (
    <div className={styles.panel}>
      {/* With an open registration the list comes first: getting back to it is the likely errand. */}
      {anyOpen && listBlock}
      <OpenForm
        tracks={tracks}
        raceDefaults={raceDefaults}
        selectedTrackId={selectedTrackId}
        now={now}
        onOpen={(input) => act(() => createRegistration(input))}
      />
      {error && (
        <p role="alert" className={styles.error} data-testid="registration-error">
          {error}
        </p>
      )}
      {!anyOpen && listBlock}
    </div>
  );
}

/** Choose the track, the duration and an optional event name, then open. */
function OpenForm({ tracks, raceDefaults, selectedTrackId, now, onOpen }) {
  const [trackId, setTrackId] = useState(selectedTrackId ?? tracks[0]?.id ?? '');
  const [duration, setDuration] = useState('15m');
  const [custom, setCustom] = useState('');
  const [eventName, setEventName] = useState('');
  const [busy, setBusy] = useState(false);

  const track = tracks.find((t) => t.id === trackId) ?? null;
  // Unknown geometry means open-or-closed is unknown, and so is the place count: refused, the way
  // Start Race refuses a track whose geometry has not loaded (SetupScreen, QUIET-FAILURES-1).
  const geometryReady = !!track?.geometryId && !!getTrack(track.geometryId);
  const capacity = geometryReady ? fieldCapFor(isTrackOpen(track, getTrack), raceDefaults) : null;
  const preset = DURATION_PRESETS.find((p) => p.key === duration);
  const customProblem = deadlineProblem(msFromLocal(custom), { now });
  const deadlineChosen = !!preset || customProblem === null;

  async function submit(e) {
    e.preventDefault();
    // A preset counts from the moment Open is pressed, not from when it was chosen.
    const closesAt = preset
      ? new Date(Date.now() + preset.ms + PRESET_GRACE_MS).toISOString()
      : new Date(msFromLocal(custom)).toISOString();
    if (!track || !capacity || !deadlineChosen || busy) return;
    setBusy(true);
    try {
      await onOpen({ trackId: track.id, capacity, eventName: eventName.trim(), closesAt });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-label="Open registration">
      <h3 className={styles.subTitle}>Open a registration</h3>
      <label className={styles.field}>
        <span>Track</span>
        <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.muted} data-testid="registration-capacity">
        {capacity
          ? `${capacity} places — this track's player limit.`
          : 'This track is not loaded yet, so its number of places is not known.'}
      </p>
      <fieldset className={styles.durations}>
        <legend>Open for</legend>
        {[...DURATION_PRESETS, { key: 'custom', label: 'Until…' }].map((p) => (
          <label key={p.key} className={styles.choice}>
            <input
              type="radio"
              name="registration-duration"
              value={p.key}
              checked={duration === p.key}
              onChange={() => setDuration(p.key)}
            />
            {p.label}
          </label>
        ))}
      </fieldset>
      {duration === 'custom' && (
        <DeadlineField
          label="Registration closes at"
          value={custom}
          onChange={setCustom}
          now={now}
          testId="registration-until-hint"
        />
      )}
      <label className={styles.field}>
        <span>Event name (optional)</span>
        <input
          type="text"
          maxLength={100}
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </label>
      <button
        className={styles.primary}
        type="submit"
        disabled={!capacity || !deadlineChosen || busy}
      >
        Open registration
      </button>
    </form>
  );
}

/**
 * The team's registrations as numbered cards: open ones first and highlighted, then the most
 * recent closed ones. A card opens its registration on a click anywhere on it, or with its "Open"
 * button (which is how the keyboard reaches it).
 */
function RegistrationList({ list, now, onShow }) {
  if (list === null) return <p className={styles.muted}>Loading registrations…</p>;
  const open = list.filter((r) => r.state === 'open');
  const closed = list.filter((r) => r.state !== 'open').slice(0, RECENT_CLOSED);
  const cards = [...open, ...closed];
  if (cards.length === 0) return <p className={styles.muted}>No registrations yet.</p>;
  return (
    <div>
      <h3 className={styles.subTitle}>Your registrations</h3>
      <ol className={styles.cards} data-testid="registration-list">
        {cards.map((r, i) => {
          const isOpen = r.state === 'open';
          const title = r.eventName || r.trackName;
          const closedAt = Date.parse(r.closedEarlyAt ?? r.closesAt);
          return (
            <li
              key={r.id}
              className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}
              data-testid="registration-card"
              data-state={r.state}
              onClick={() => onShow(r.id)}
            >
              <span className={styles.cardNumber}>{i + 1}</span>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  {title}{' '}
                  <span className={isOpen ? styles.badgeOpen : styles.badgeClosed}>
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className={styles.muted}>
                  {r.trackName} · {r.taken} of {r.capacity} places ·{' '}
                  {isOpen
                    ? `${formatTimeLeft(msUntil(r.closesAt, now))} left`
                    : `closed ${formatDeadline(closedAt)}`}
                </div>
              </div>
              <button
                type="button"
                className={styles.cardOpenButton}
                aria-label={`Open registration ${i + 1}: ${title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onShow(r.id);
                }}
              >
                Open
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** One registration: the link, the QR code, the counts, the names and the actions. */
function RegistrationView({
  registration: r,
  timeLeft,
  now,
  error,
  onBack,
  onClose,
  onExtend,
  onRemove,
  onDelete,
  onUsePlayers,
}) {
  const [stage, setStage] = useState(false);
  // Stable, so the stage's effect (full screen, key listener) runs once per opening.
  const exitStage = useCallback(() => setStage(false), []);
  const [copied, setCopied] = useState(false);
  const [customExtend, setCustomExtend] = useState('');
  const link = joinLinkFor(r.code);
  const open = r.state === 'open' && timeLeft > 0;
  const extendRules = { openedAt: Date.parse(r.createdAt), after: Date.parse(r.closesAt) };
  const extendProblem = deadlineProblem(msFromLocal(customExtend), { now, ...extendRules });

  return (
    <div className={styles.panel} data-testid="registration-view">
      <button type="button" className={styles.backButton} onClick={onBack}>
        ← Back to all registrations
      </button>
      <h3 className={styles.subTitle}>{r.eventName || 'Registration'}</h3>
      <p className={styles.muted}>Track: {r.trackName}</p>

      <div className={styles.share}>
        <QrCode text={link} label="QR code of the join link" className={styles.qr} />
        <div className={styles.shareText}>
          <code className={styles.link} data-testid="registration-link">
            {link}
          </code>
          <div className={styles.row}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText?.(link);
                setCopied(true);
              }}
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <QrShareButtons
              link={link}
              eventName={r.eventName}
              trackName={r.trackName}
              className={styles.row}
            />
            <button type="button" onClick={() => setStage(true)}>
              Show QR full screen
            </button>
          </div>
        </div>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Places</dt>
          <dd data-testid="registration-places">
            {r.taken} taken · {r.placesLeft} left of {r.capacity}
          </dd>
        </div>
        <div>
          <dt>Time left</dt>
          <dd data-testid="registration-time-left">{formatTimeLeft(open ? timeLeft : 0)}</dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className={styles.error} data-testid="registration-error">
          {error}
        </p>
      )}

      <ol className={styles.names} data-testid="registration-names">
        {r.entries.map((e) => (
          <li key={e.id}>
            <span>{e.name}</span>
            <button
              type="button"
              className={styles.remove}
              title={`Remove ${e.name}`}
              aria-label={`Remove ${e.name}`}
              onClick={() => onRemove(e.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      {r.entries.length === 0 && <p className={styles.muted}>Nobody has registered yet.</p>}

      {open ? (
        <>
          <div className={styles.row}>
            <button type="button" onClick={onClose}>
              Close now
            </button>
            <span className={styles.muted}>Extend:</span>
            {EXTEND_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => onExtend(new Date(Date.parse(r.closesAt) + p.ms).toISOString())}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <DeadlineField
              label="Extend until"
              value={customExtend}
              onChange={setCustomExtend}
              now={now}
              rules={extendRules}
              testId="registration-extend-hint"
            />
            <button
              type="button"
              disabled={extendProblem !== null}
              onClick={() => onExtend(new Date(msFromLocal(customExtend)).toISOString())}
            >
              Extend until
            </button>
          </div>
        </>
      ) : (
        <div className={styles.row}>
          <span className={styles.closed}>Registration is closed.</span>
          <button
            type="button"
            className={styles.primary}
            disabled={r.entries.length === 0}
            title="Replaces the names in the Players tab and selects this track"
            onClick={onUsePlayers}
          >
            Use these players
          </button>
        </div>
      )}

      <div className={styles.row}>
        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            if (window.confirm('Delete this registration and every name in it?')) onDelete();
          }}
        >
          Delete registration
        </button>
      </div>

      {stage && <QrStage registration={r} link={link} onExit={exitStage} />}
    </div>
  );
}

/**
 * The stage view: the QR code as large as the window allows, with the event, the track and the
 * link, for a projector or a TV across the room. It takes the whole screen (the browser's full-screen
 * mode where it is allowed) and leaves with Escape or the button. "Copy QR code" and "Download QR"
 * are here too, for whoever is at the stage machine.
 */
function QrStage({ registration: r, link, onExit }) {
  useEffect(() => {
    const el = document.querySelector('[data-testid="qr-stage"]');
    let entered = false;
    el?.requestFullscreen?.().then(
      () => {
        entered = true;
      },
      () => {}
    );
    const onKey = (e) => {
      if (e.key === 'Escape') onExit();
    };
    // In full-screen mode the browser takes Escape itself and leaves full screen; the stage then
    // closes with it, so one key press is enough either way.
    const onFullscreenChange = () => {
      if (entered && !document.fullscreenElement) onExit();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onExit]);

  return (
    <div className={styles.stage} data-testid="qr-stage" role="dialog" aria-label="Join by QR code">
      <h2 className={styles.stageTitle}>{r.eventName || 'Join the race'}</h2>
      <p className={styles.stageTrack}>{r.trackName} · scan to register</p>
      <QrCode text={link} label="QR code of the join link" className={styles.stageQr} />
      <code className={styles.stageLink}>{link}</code>
      <QrShareButtons
        link={link}
        eventName={r.eventName}
        trackName={r.trackName}
        className={styles.stageShare}
      />
      <button type="button" className={styles.stageExit} onClick={onExit}>
        Close
      </button>
    </div>
  );
}
