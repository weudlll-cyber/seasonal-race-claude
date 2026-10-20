// ============================================================
// File:        RegistrationPanel.jsx
// Path:        client/src/screens/SetupScreen/RegistrationPanel.jsx
// Project:     RaceArena — REGISTRATION-1 (the owner's decisions of 2026-10-20)
// Description: The Players tab's second way to fill a race: "Open registration". The director
//              chooses a track, how long registration stays open and an optional event name; the
//              server opens it with the track's place count (server/src/routes/registrations.js).
//              Then this panel shows the join link with a copy button and a QR code, places taken
//              and left, the time left, the live list with a remove button per name, "Close now",
//              "Extend", "Show QR full screen" and "Delete registration". When it is closed, "Use
//              these players" hands the names and the track to the Setup screen, and the race is
//              started through the normal Start Race flow — nothing here starts a race.
//
// ── THE PLACE COUNT IS THE PLAYERS TAB'S OWN LIMIT ─────────────────────────────────────────────
// Computed for the chosen track exactly as the Players tab computes it for the selected one:
// `isTrackOpen` and `fieldCapFor` (fieldCap.js). Sent once, on creation; the server bounds it and
// holds it fixed, so a later change to the race defaults does not change an open registration.
//
// ── LIVE BY POLLING ────────────────────────────────────────────────────────────────────────────
// While a registration is shown and open, it is asked for again every 5 s (no new transport); the
// countdown ticks every second from this device's clock, and the server's clock decides.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import QrCode from '../../components/QrCode/QrCode.jsx';
import {
  closeRegistration,
  createRegistration,
  deleteRegistration,
  extendRegistration,
  fetchRegistration,
  listRegistrations,
  removeRegistrationEntry,
} from '../../services/registrationApi.js';
import { formatTimeLeft, msUntil } from '../../modules/registration/timeLeft.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import { fieldCapFor, isTrackOpen } from './fieldCap.js';
import styles from './RegistrationPanel.module.css';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long registration stays open: the presets of the owner's decisions, and a custom time. */
const DURATION_PRESETS = [
  { key: '5m', label: '5 min', ms: 5 * MINUTE },
  { key: '15m', label: '15 min', ms: 15 * MINUTE },
  { key: '1h', label: '1 hour', ms: HOUR },
  { key: '1d', label: '1 day', ms: DAY },
  { key: '3d', label: '3 days', ms: 3 * DAY },
  { key: '7d', label: '7 days', ms: 7 * DAY },
];
/** How much later "Extend" moves the deadline. */
const EXTEND_PRESETS = [
  { key: '+5m', label: '+5 min', ms: 5 * MINUTE },
  { key: '+15m', label: '+15 min', ms: 15 * MINUTE },
  { key: '+1h', label: '+1 hour', ms: HOUR },
  { key: '+1d', label: '+1 day', ms: DAY },
];
const POLL_MS = 5 * 1000;

/** The link a player opens: this app's own address, so it is right behind any proxy. */
function joinLinkFor(code) {
  return `${window.location.origin}/join/${code}`;
}

/** A `datetime-local` value as an ISO instant, or null when it is empty or not a time. */
function isoFromLocal(value) {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
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
  const [now, setNow] = useState(() => Date.now());

  const refreshList = useCallback(async () => {
    try {
      setList(await listRegistrations());
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Poll the shown registration while it is open; tick the countdown every second.
  const shownId = shown?.id ?? null;
  const shownOpen = shown?.state === 'open';
  useEffect(() => {
    if (!shownId) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = shownOpen
      ? setInterval(async () => {
          try {
            setShown(await fetchRegistration(shownId));
          } catch (err) {
            setError(errorText(err));
          }
        }, POLL_MS)
      : null;
    return () => {
      clearInterval(tick);
      if (poll) clearInterval(poll);
    };
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

  return (
    <div className={styles.panel}>
      <OpenForm
        tracks={tracks}
        raceDefaults={raceDefaults}
        selectedTrackId={selectedTrackId}
        onOpen={(input) => act(() => createRegistration(input))}
      />
      {error && (
        <p role="alert" className={styles.error} data-testid="registration-error">
          {error}
        </p>
      )}
      <RegistrationList list={list} onShow={(id) => act(() => fetchRegistration(id))} />
    </div>
  );
}

/** Choose the track, the duration and an optional event name, then open. */
function OpenForm({ tracks, raceDefaults, selectedTrackId, onOpen }) {
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
  const deadlineChosen = !!preset || !!isoFromLocal(custom);

  async function submit(e) {
    e.preventDefault();
    // A preset counts from the moment Open is pressed, not from when it was chosen.
    const closesAt = preset ? new Date(Date.now() + preset.ms).toISOString() : isoFromLocal(custom);
    if (!track || !capacity || !closesAt || busy) return;
    setBusy(true);
    try {
      await onOpen({ trackId: track.id, capacity, eventName: eventName.trim(), closesAt });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-label="Open registration">
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
        {duration === 'custom' && (
          <input
            type="datetime-local"
            aria-label="Registration closes at"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
      </fieldset>
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

/** The team's open and recently closed registrations, newest first. */
function RegistrationList({ list, onShow }) {
  if (list === null) return <p className={styles.muted}>Loading registrations…</p>;
  const recent = list.slice(0, 10);
  if (recent.length === 0) return <p className={styles.muted}>No registrations yet.</p>;
  return (
    <div className={styles.list}>
      <h3 className={styles.subTitle}>Open and recent registrations</h3>
      <ul>
        {recent.map((r) => (
          <li key={r.id}>
            <button type="button" className={styles.linkButton} onClick={() => onShow(r.id)}>
              {r.eventName || r.trackName}
            </button>{' '}
            <span className={styles.muted}>
              {r.trackName} · {r.taken}/{r.capacity} · {r.state === 'open' ? 'open' : 'closed'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One registration: the link, the QR code, the counts, the names and the actions. */
function RegistrationView({
  registration: r,
  timeLeft,
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

  return (
    <div className={styles.panel} data-testid="registration-view">
      <button type="button" className={styles.linkButton} onClick={onBack}>
        ← All registrations
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
          <input
            type="datetime-local"
            aria-label="Extend until"
            value={customExtend}
            onChange={(e) => setCustomExtend(e.target.value)}
          />
          <button
            type="button"
            disabled={!isoFromLocal(customExtend)}
            onClick={() => onExtend(isoFromLocal(customExtend))}
          >
            Extend until
          </button>
        </div>
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
 * mode where it is allowed) and leaves with Escape or the button.
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
      <button type="button" className={styles.stageExit} onClick={onExit}>
        Close
      </button>
    </div>
  );
}
