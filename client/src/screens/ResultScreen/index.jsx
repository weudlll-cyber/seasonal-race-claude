// ============================================================
// File:        index.jsx
// Path:        client/src/screens/ResultScreen/index.jsx
// Project:     RaceArena
// Created:     2026-04-20
// Description: Post-race results screen — podium, rankings, and history tracking
//
//              ── THE PODIUM IS BUILT UP, NOT SHOWN FINISHED (PODIUM-BUILD-1) ────────────────────
//              The screen arrives in beats: 3rd, then 2nd, then the winner — who is held twice as
//              long, because a sequence with no long beat has no moment in it — and only then does
//              everything below the podium settle in. One config key (`podiumRevealBeatMs`) is the
//              beat; every other time here is a whole multiple of it.
//
//              THE FINAL STATE IS EXACTLY WHAT IT WAS, and the design is built around that rather
//              than checked against it afterwards. A revealed element carries NO class: "revealed"
//              is the absence of `result-pending`, so the last step of the sequence removes the last
//              attribute and what is left is byte-for-byte the DOM this screen rendered before the
//              feature existed. `ResultScreen.ceremony.test.jsx` compares the two directly.
//
//              THE ARRIVAL MOTION IS THE ONE THE SCREEN ALREADY HAD. `.result-pending` sets
//              `animation: none`, which parks the element's own entrance animation (`podiumAppear`,
//              `slideIn`) instead of letting it play to an invisible element; removing the class
//              hands the animation-name back and the browser starts it fresh. No second motion was
//              written, and nothing has to be kept in step with the CSS.
//
//              WHY IT PLAYS ON EVERY ARRIVAL — including a reload. There is exactly one way into
//              this screen: RaceScreen navigates here after the last crossing. The Dev Screen's race
//              history is a list and links nowhere; "Back to Setup" deletes the `raceResults` payload
//              so a browser Back lands on /setup instead. The only arrival that is not a finished
//              race is a RELOAD of a live payload, and telling those two apart needs a value that
//              does not exist — the RaceScreen would have to stamp the payload, and the race screen
//              is out of scope here. The skip below is what makes that cheap: any click or key press
//              ends the sequence at once.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFadeNavigate } from '../../contexts/TransitionContext.jsx';
import { storageGet, storageSet, KEYS, newId } from '../../modules/storage/storage';
import { formatRaceTime } from '../../utils/formatRaceTime.js';
import { useActiveBrandProfile } from '../../modules/branding/useActiveBrandProfile.js';
import { loadCameraConfig } from '../../modules/cameraConfig.js';
import './ResultScreen.css';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_RACE_DEFAULTS, DEFAULT_CAMERA_CONFIG } from '../../modules/storage/defaults.js';

/**
 * The sequence, counted in BEATS rather than in milliseconds — the one config key multiplies them.
 *
 * `WINNER: 2` and `TAIL: 4` is the whole shape: the winner arrives one beat after 2nd like everyone
 * else, and then holds for TWO before the ranking follows. Equal beats throughout would make the
 * winner the third item in a stagger; this makes him the moment the sequence is built around.
 *
 * `DONE` is one beat past the last reveal, and it is not a visible step. It is when the last
 * ceremony class comes off, and it is a beat later than `TAIL` only so that the winner's accent
 * flash — which lasts exactly one beat — can never be cut short by the teardown.
 */
const STEP = { NOTHING: 0, THIRD: 1, SECOND: 2, WINNER: 3, TAIL: 4, DONE: 5 };

/** When each step fires, in beats from the moment the results appear. */
const STEP_AT_BEATS = { [STEP.THIRD]: 0, [STEP.SECOND]: 1, [STEP.WINNER]: 2, [STEP.TAIL]: 4 };

/** The beat after the last reveal, when every ceremony class comes off. See `STEP.DONE`. */
const DONE_AT_BEATS = 5;

/** True when the system asks for reduced motion. Absent `matchMedia` (jsdom, old browsers) = no. */
function prefersReducedMotion() {
  return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

/**
 * A podium slot's class suffix. Before its beat it is pending; on its beat it gains the accent
 * flash; once the sequence is done it carries NOTHING — which is what makes the final DOM today's.
 */
function slotClass(step, at) {
  if (step >= STEP.DONE) return '';
  return step >= at ? ' result-arrive' : ' result-pending';
}

/**
 * Everything below the podium: pending until the tail beat, then nothing at all.
 *
 * No accent here on purpose. The flash is the podium's, and giving the ranking one as well would
 * make the tail compete with the moment the whole sequence was built to arrive at.
 */
function tailClass(step) {
  return step >= STEP.TAIL ? '' : ' result-pending';
}

function ResultScreen() {
  const navigate = useFadeNavigate();
  const [finishOrder, setFinishOrder] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [race, setRace] = useState(null);
  // React 18 StrictMode fires every effect twice in dev (mount → unmount → remount).
  // This ref survives the simulated unmount and prevents a double history write.
  const hasSaved = useRef(false);

  const activeBrand = useActiveBrandProfile();

  // ── THE BUILD-UP (PODIUM-BUILD-1) ───────────────────────────────────────────────────────────────
  // Read once, at mount. The beat is taste and the owner changes it between races, never during one;
  // re-reading it mid-sequence could only produce a schedule that half-belongs to two values.
  const beatMs = useMemo(() => {
    const v = loadCameraConfig().podiumRevealBeatMs ?? DEFAULT_CAMERA_CONFIG.podiumRevealBeatMs;
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, []);

  // TWO WAYS TO NOT PLAY, and they are the same absence: the key at 0, and a system asking for
  // reduced motion. Neither is a fast animation — `step` STARTS at DONE, so the very first render is
  // the final DOM and no timer and no listener is ever created.
  const willPlay = useMemo(() => beatMs > 0 && !prefersReducedMotion(), [beatMs]);
  const [step, setStep] = useState(() => (willPlay ? STEP.NOTHING : STEP.DONE));

  const timersRef = useRef([]);
  const containerRef = useRef(null);

  // THE BRAND'S COLOURS CARRY THE MOMENT, and they carry it as custom properties rather than as
  // painted styles — so the CSS can fall back to the podium's own metals (gold, silver, bronze) when
  // no brand is chosen. Without a brand the build-up is not a stripped version of the branded one;
  // it is the same build-up in the palette this screen has always used.
  //
  // WHY THIS IS WRITTEN TO THE NODE AND NOT PASSED AS A `style` PROP, and the test that found it:
  // React does not REMOVE a style attribute it once wrote — setting the prop back to `undefined`
  // empties it and leaves `style=""` on the element. That single empty attribute is the difference
  // between "the final DOM is today's" and "the final DOM is nearly today's", so the attribute is
  // managed here instead and genuinely removed when the sequence ends.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (step >= STEP.DONE) {
      el.removeAttribute('style');
      return;
    }
    // The flash lasts exactly one beat, so the one key sets it too and nothing here is a second,
    // hidden duration.
    el.style.setProperty('--result-beat', `${beatMs}ms`);
    const brand1 = activeBrand?.primaryColor;
    const brand2 = activeBrand?.secondaryColor || activeBrand?.primaryColor;
    if (brand1) el.style.setProperty('--result-brand-1', brand1);
    if (brand2) el.style.setProperty('--result-brand-2', brand2);
  }, [step, beatMs, activeBrand?.primaryColor, activeBrand?.secondaryColor]);

  useEffect(() => {
    // Start with the CONTENT, not with the mount: until the payload is parsed this screen renders
    // the loading line, and a sequence begun there would spend its first beats on nothing.
    if (!willPlay || !finishOrder.length) return undefined;

    const timers = timersRef.current;
    for (const [target, beats] of Object.entries(STEP_AT_BEATS)) {
      timers.push(setTimeout(() => setStep(Number(target)), beats * beatMs));
    }
    timers.push(setTimeout(() => setStep(STEP.DONE), DONE_AT_BEATS * beatMs));

    return () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
    // `step` is deliberately NOT a dependency: the whole schedule is laid down once, and re-running
    // this on every step would restart every remaining timer from that moment.
  }, [willPlay, finishOrder.length, beatMs]);

  // THE ESCAPE HATCH: twenty races must not cost twenty build-ups. Any click or key press ends it.
  // Its own effect, keyed on `step`, so the listeners are gone the moment there is nothing left to
  // skip — the schedule above must NOT be keyed on `step`, and one effect cannot be both.
  // Capture phase on `window`, so the first press anywhere completes the screen, including one that
  // lands on the Back button while it is still invisible.
  useEffect(() => {
    if (step >= STEP.DONE) return undefined;
    const skip = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.length = 0;
      setStep(STEP.DONE);
    };
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', skip, true);
    return () => {
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', skip, true);
    };
  }, [step]);

  useEffect(() => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    const raw = sessionStorage.getItem('raceResults');
    if (!raw) {
      navigate('/setup');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      navigate('/setup');
      return;
    }
    const order = parsed.finishOrder || [];
    setFinishOrder(order);
    setElapsedTime(parsed.elapsedTime || 0);
    setRace(parsed.race || {});

    // Persist to race history
    const history = storageGet(KEYS.RACE_HISTORY, []);
    history.unshift({
      id: newId(),
      date: new Date().toISOString(),
      trackId: parsed.race?.trackId,
      duration: parsed.elapsedTime,
      playerCount: order.length,
      // SEED-REAL-RACE-1: the seed this race ran with, stored WITH the race and in localStorage, so
      // it outlives the session the way the rest of the entry already does. `null` for a race from
      // before the seed existed, and for the legacy unseeded value 0 — a race that cannot be
      // reproduced should say so rather than claim seed zero, which reads like a seed.
      seed: Number(parsed.race?.racePlanSeed) > 0 ? Number(parsed.race.racePlanSeed) : null,
      winners: order
        .slice(0, parsed.race?.winners ?? DEFAULT_RACE_DEFAULTS.winners)
        .map((r) => r.name),
      finishOrder: order,
    });
    storageSet(KEYS.RACE_HISTORY, history.slice(0, 100));
  }, [navigate]);

  const handleReturnToSetup = () => {
    sessionStorage.removeItem('activeRace');
    sessionStorage.removeItem('raceResults');
    navigate('/setup');
  };

  if (!finishOrder.length) {
    return <div className="screen screen--result loading">Loading results…</div>;
  }

  const [first, second, third] = finishOrder;

  // SEED-REAL-RACE-1: the seed shown beside track and time. This is the screen the owner already
  // looks at after every race, which is the whole reason it is here and not only in the HUD — the
  // HUD's seed pill is on screen while he is watching the race, not while he is reading the result.
  // `> 0` rather than `!= null`: 0 is the legacy UNSEEDED value, and printing "Seed 0" would offer
  // a number that reproduces nothing.
  const raceSeed = Number(race?.racePlanSeed) > 0 ? Number(race.racePlanSeed) : null;

  return (
    <div className="screen screen--result">
      <div className="results-container" ref={containerRef}>
        <h1 className="results-title">🏁 Race Results</h1>

        {/* Brand identity block (event name + subtitle + track·time) or bare track·time */}
        {activeBrand ? (
          <div className="brand-identity">
            <div className="brand-event-name" style={{ color: activeBrand.primaryColor }}>
              {activeBrand.eventName}
            </div>
            {activeBrand.subtitle && (
              <div className="brand-subtitle" style={{ color: activeBrand.secondaryColor }}>
                {activeBrand.subtitle}
              </div>
            )}
            {race && (
              <div className="race-info">
                <span className="race-track">{race.trackName || 'Track'}</span>
                <span className="race-time">{elapsedTime}s</span>
                {raceSeed != null && <span className="race-seed">Seed {raceSeed}</span>}
              </div>
            )}
          </div>
        ) : (
          race && (
            <div className="race-info">
              <span className="race-track">{race.trackName || 'Track'}</span>
              <span className="race-time">{elapsedTime}s</span>
              {raceSeed != null && <span className="race-seed">Seed {raceSeed}</span>}
            </div>
          )
        )}

        {/* Brand logo */}
        {activeBrand?.logo && (
          <div className="brand-logo-result">
            <img
              src={activeBrand.logo}
              alt={activeBrand.eventName}
              className="brand-logo-result__img"
              style={{ opacity: activeBrand.logoOpacity ?? 0.9 }}
            />
          </div>
        )}

        {/* Podium — ranks 1–3 */}
        <div className="podium-section">
          <div className="podium">
            {second && (
              <div className={`podium-slot podium-slot--2nd${slotClass(step, STEP.SECOND)}`}>
                <div className="podium-medal">🥈</div>
                <div className="podium-racer">
                  <div className="podium-icon">{second.icon}</div>
                  <div className="podium-name">{second.name}</div>
                  {second.finishTimeMs != null && (
                    <div className="podium-finish-time">{formatRaceTime(second.finishTimeMs)}</div>
                  )}
                </div>
                <div className="podium-rank">2nd</div>
              </div>
            )}

            {first && (
              <div className={`podium-slot podium-slot--1st${slotClass(step, STEP.WINNER)}`}>
                <div className="podium-medal">🥇</div>
                <div className="podium-racer">
                  <div className="podium-icon">{first.icon}</div>
                  <div className="podium-name">{first.name}</div>
                  {first.finishTimeMs != null && (
                    <div className="podium-finish-time">{formatRaceTime(first.finishTimeMs)}</div>
                  )}
                </div>
                <div className="podium-rank">1st</div>
              </div>
            )}

            {third && (
              <div className={`podium-slot podium-slot--3rd${slotClass(step, STEP.THIRD)}`}>
                <div className="podium-medal">🥉</div>
                <div className="podium-racer">
                  <div className="podium-icon">{third.icon}</div>
                  <div className="podium-name">{third.name}</div>
                  {third.finishTimeMs != null && (
                    <div className="podium-finish-time">{formatRaceTime(third.finishTimeMs)}</div>
                  )}
                </div>
                <div className="podium-rank">3rd</div>
              </div>
            )}
          </div>
        </div>

        {/* Ranks 4+ in a fixed-height scroll panel; hidden when ≤3 finishers */}
        {finishOrder.length > 3 && (
          <div className={`rankings-section${tailClass(step)}`}>
            <h2 className="rankings-title">Final Rankings</h2>
            <div className="rankings-table rankings-scroll">
              {finishOrder.slice(3).map((racer, index) => (
                <div key={racer.index ?? index + 3} className="ranking-row">
                  <span className="rank-number">#{index + 4}</span>
                  <span className="rank-icon">{racer.icon}</span>
                  <span className="rank-name">{racer.name}</span>
                  <span className="rank-time">
                    {racer.finishTimeMs != null ? formatRaceTime(racer.finishTimeMs) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`results-actions${tailClass(step)}`}>
          <button className="btn btn--primary" onClick={handleReturnToSetup}>
            ← Back to Setup
          </button>
        </div>

        {/* Sponsor strip — grey footer, unchanged */}
        {race?.sponsorText && (
          <div className={`result-sponsor${tailClass(step)}`}>{race.sponsorText}</div>
        )}
      </div>
    </div>
  );
}

export default ResultScreen;
