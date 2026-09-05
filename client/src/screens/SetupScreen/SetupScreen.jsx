// ============================================================
// File:        SetupScreen.jsx
// Path:        client/src/screens/SetupScreen/SetupScreen.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Pre-race setup screen — players, track selection, settings;
//              reads tracks and defaults from localStorage so Dev Panel
//              changes are reflected immediately
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SeedRedeliveryNotice from '../../components/SeedRedeliveryNotice.jsx';
import PlayerSetup from './PlayerSetup.jsx';
import PlayerGroupPicker from './PlayerGroupPicker.jsx';
import { sectionsOf } from './rosterGroups.js';
import { fieldCapFor, quickTestFieldSize } from './fieldCap.js';
import TrackSelector from './TrackSelector.jsx';
import RaceSettings from './RaceSettings.jsx';
import { useStorage } from '../../modules/storage/useStorage.js';
import { useServerTracks } from '../../modules/storage/useServerTracks.js';
import { KEYS, storageGet, storageSet, storageRemove } from '../../modules/storage/storage.js';
import {
  DEFAULT_RACE_DEFAULTS,
  DEFAULT_BRANDING,
  DEFAULT_ACTIVE_SESSION,
  DEFAULT_CONFIG_WORLD,
} from '../../modules/storage/defaults.js';
import {
  getRacerType,
  getRacerTypeLabel,
  listAllRacerTypes,
} from '../../modules/racer-types/index.js';
import { filterRacerTypesForTrack } from '../../modules/surface-effects/registry.js';
import { getTrack } from '../../modules/track-editor/trackStorage.js';
import {
  decodeRaceIdentifier,
  encodeRaceIdentifier,
  looksLikeRaceIdentifier,
} from '../../modules/raceIdentifier.js';
import { raceIdentifierBuildId } from '../../modules/raceIdentifierBuild.js';
import { buildWorldConfig } from '../../modules/exportRaceConfig.js';
import { EditorShape } from '../../modules/track-editor/EditorShape.js';
import {
  deriveRaceDuration,
  naturalMaxSeconds,
  normalSpeedFrom,
  paceSpeedPxPerSec,
  fieldFinishWindow,
  secondsForLaps,
  trackDefaultLaps,
  trackDefaultSeconds,
  OPEN_TRACK_MIN_SECONDS,
} from '../../modules/durationModel.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { computeRacersPerRow } from '../../modules/rowLayout.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import { loadRaceDynamicsConfig } from '../../modules/raceDynamicsConfig.js';
import { normalizeRaceActionStage } from '../../modules/raceActionStage.js';
import { resolveActiveBrandProfile } from '../../modules/branding/useActiveBrandProfile.js';
import {
  sanitizeQuickTestSeedInput,
  resolveQuickTestSeed,
  QUICK_TEST_SEED_MIN,
  QUICK_TEST_SEED_MAX,
} from './quickTestSeed.js';
import styles from './SetupScreen.module.css';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { resolveNameSet, DEFAULT_NAME_SET } from '../../modules/racerNames.js';

const TABS = ['Players', 'Track', 'Settings'];

// Lap counts offered on closed tracks. The model accepts any integer >= 1; these are the
// buttons. There is deliberately no speed-up control — one lap is the shortest race there is.
const LAP_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10];

function SetupScreen() {
  const navigate = useNavigate();
  // RACE-IDENTIFIER-1: why the last identifier was refused. Shown beside the field, because a
  // refusal the operator cannot see is indistinguishable from a button that does nothing.
  const [identifierError, setIdentifierError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const [racerTypeOverrides] = useStorage(KEYS.RACER_TYPE_OVERRIDES, {});
  const tracks = useServerTracks();
  const [raceDefaults] = useStorage(KEYS.RACE_DEFAULTS, DEFAULT_RACE_DEFAULTS);
  const [brandingProfiles] = useStorage(KEYS.BRANDING, DEFAULT_BRANDING);
  const [activeSession, setActiveSession] = useStorage(KEYS.ACTIVE_SESSION, DEFAULT_ACTIVE_SESSION);

  const activeBrandProfile = resolveActiveBrandProfile(brandingProfiles, activeSession);

  // Inject brand CSS vars whenever the active profile changes.
  // Vars are set on document.documentElement so they persist through navigation.
  // Removing them lets each CSS use-site's var() fallback take over.
  useEffect(() => {
    const profile = resolveActiveBrandProfile(brandingProfiles, activeSession);
    const root = document.documentElement.style;
    if (profile) {
      root.setProperty('--brand-primary', profile.primaryColor);
      root.setProperty('--brand-secondary', profile.secondaryColor);
    } else {
      root.removeProperty('--brand-primary');
      root.removeProperty('--brand-secondary');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effect only needs activeSession.activeBrandingProfileId — the sole field resolveActiveBrandProfile reads; depending on the whole activeSession would cause needless re-runs
  }, [activeSession?.activeBrandingProfileId, brandingProfiles]);

  // Initialise race settings from stored defaults; user may override during the session.
  // Declared before the effect below, which is its first consumer.
  const [raceSettings, setRaceSettings] = useState({
    duration: raceDefaults.duration,
    winners: raceDefaults.winners,
    eventName: '',
  });

  // ── SEED-REAL-RACE-1: the normal "Start Race" path draws a seed ─────────────────────────────
  //
  // It used to pass `racePlanSeed: 0` — the unseeded path — so a real race was never reproducible,
  // including the ones the owner judges. The semantics are Quick-Test's, unchanged and shared
  // (`quickTestSeed.js`): empty field ⇒ draw one fresh seed here, BEFORE the race starts, so the
  // race stays a pure function of it; a typed number fixes the race; 0 is unreachable from the
  // field.
  //
  // BOTH VALUES LIVE IN localStorage, NOT sessionStorage, and that is the point of the change
  // rather than a detail of it. His case is "watch a race, close the browser, come back, re-run
  // that race" — a session store loses exactly that. The TYPED field persists so a pinned seed
  // survives a restart; the seed the last race actually RAN with is written separately, because a
  // DRAWN seed is deliberately never written back into the field (the field must stay empty so the
  // next race draws again instead of pinning itself to the first draw).
  const [raceSeed, setRaceSeed] = useState(() =>
    sanitizeQuickTestSeedInput(storageGet(KEYS.RACE_SEED, '') ?? '')
  );
  useEffect(() => {
    // Removed rather than stored as '': an empty field is the meaningful "random" state, and an
    // empty string in storage would be a second way to spell it.
    if (raceSeed === '') storageRemove(KEYS.RACE_SEED);
    else storageSet(KEYS.RACE_SEED, raceSeed);
  }, [raceSeed]);
  // The seed the LAST race ran with — drawn or typed. Read once at mount and kept in state so the
  // panel can offer it back; updated on start so returning from a race shows the new value.
  const [lastRaceSeed, setLastRaceSeed] = useState(() => {
    const v = Number(storageGet(KEYS.LAST_RACE_SEED, 0));
    return Number.isSafeInteger(v) && v > 0 ? v : null;
  });
  // RUN-IT-AGAIN-1: the whole last race, beside its number. Null is a real and expected state — a
  // race from before this key existed, or one whose screen state could not be encoded — and the
  // panel says so rather than pretending the seed is as good.
  const [lastRaceIdentifier, setLastRaceIdentifier] = useState(() => {
    const v = storageGet(KEYS.LAST_RACE_IDENTIFIER, null);
    return looksLikeRaceIdentifier(v) ? v : null;
  });

  // RUN-IT-AGAIN-1 — record the race that is about to run, as a whole race.
  //
  // ★ IT ENCODES THE SAME VALUES THE PAYLOAD CARRIES, from the payload itself, so the recorded
  // identifier cannot describe a different race from the one that starts. The world is read the
  // same way the race path reads it moments later (`RaceScreen/index.jsx:476-503` with no override
  // in play), which is what makes this a record of THIS race rather than of this screen.
  //
  // A failure here must never stop a race: the race is the point, the record is a convenience, so
  // it is caught and stored as absent — which the panel then reports honestly.
  function rememberStartedRace(race, identifierIfPasted = null) {
    storageSet(KEYS.LAST_RACE_SEED, race.racePlanSeed);
    setLastRaceSeed(race.racePlanSeed);
    let id = identifierIfPasted;
    if (!id) {
      try {
        id = encodeRaceIdentifier({
          geometryId: race.geometryId,
          racerTypeId: race.racerTypeId,
          names: race.racers.map((r) => r.name),
          racePlanSeed: race.racePlanSeed,
          raceActionStage: race.raceActionStage,
          targetLaps: race.targetLaps,
          targetDurationSec: race.targetDurationSec,
          racePlanEnabled: race.racePlanEnabled,
          world: buildWorldConfig({ raceActionStage: race.raceActionStage }),
          defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
          buildId: raceIdentifierBuildId(),
        });
      } catch (err) {
        console.warn('[setup] this race could not be recorded as an identifier:', err);
        id = null;
      }
    }
    storageSet(KEYS.LAST_RACE_IDENTIFIER, id);
    setLastRaceIdentifier(id);
  }

  // Seed eventName from the active brand profile; clear unconditionally when no profile is active.
  useEffect(() => {
    const profile = resolveActiveBrandProfile(brandingProfiles, activeSession);
    setRaceSettings((prev) => ({ ...prev, eventName: profile?.eventName || '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same as above — only activeBrandingProfileId is read via resolveActiveBrandProfile
  }, [activeSession?.activeBrandingProfileId, brandingProfiles]);

  // Consume any group loaded from the Dev Panel (one-shot read + clear).
  // useEffect instead of lazy initializer: StrictMode double-invokes initializers,
  // clearing storage on the first call so the second finds nothing.
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    const active = storageGet(KEYS.ACTIVE_GROUP);
    if (active && active.length > 0) {
      storageSet(KEYS.ACTIVE_GROUP, null);
      setPlayers(active);
    }
  }, []);

  const [behaviorConfig] = useState(() => loadRaceBehaviorConfig());
  // Race-plan enable threshold — single source with the runtime gate (index.jsx reads the same
  // racePlanMinDurationSec). Last-resort ?? 30 mirrors the runtime gate's fallback and the default.
  const [racePlanMinDur] = useState(() => loadRaceDynamicsConfig().racePlanMinDurationSec ?? 30);

  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [racerTypeOverride, setRacerTypeOverride] = useState(null);
  // CLOSED tracks: the operator picks LAPS and the duration is derived. OPEN tracks: the operator
  // picks SECONDS and the finish line is derived. There is no closed-track duration control any
  // more — the shortest closed race is one lap, whatever it lasts (no speed-up option exists).
  const [selectedLaps, setSelectedLaps] = useState(null); // null = the track's default lap count
  const [openTrackDuration, setOpenTrackDuration] = useState(null); // null = set from track default

  useEffect(() => {
    setRacerTypeOverride(null);
    setSelectedLaps(null);
    setOpenTrackDuration(null);
  }, [selectedTrackId]);

  // Clear override if the chosen type gets disabled while it's selected.
  useEffect(() => {
    if (racerTypeOverride && racerTypeOverrides[racerTypeOverride] === false) {
      setRacerTypeOverride(null);
    }
  }, [racerTypeOverrides, racerTypeOverride]);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  // ── QUIET-FAILURES-1: IS THE GEOMETRY ACTUALLY THERE, or only NAMED? ─────────────────────────
  // `geometryId` says the track SUMMARY names a geometry. `getTrack` says whether the geometry is
  // really in the cache. Nothing asked the second question until now, and the difference is a
  // whole race: `trackIsOpen` below resolves a missing geometry to `false` = CLOSED, so an OPEN
  // track whose geometry failed to cache started as a LAPS race — right name, right picture, wrong
  // race, no message anywhere. `cacheTrackGeometry` drops a geometry on a 3 s timeout and its
  // caller discards the result, so this is one slow server away and not hypothetical.
  //
  // THERE IS NOTHING HONEST TO GUESS: the flag we would have to invent IS the race mode. So the
  // answer is to REFUSE, and the refusal reuses the pattern these buttons already have — `disabled`
  // plus a `title` that says why. No new component, no new message style, no new state.
  const selectedGeometryReady = !!selectedTrack?.geometryId && !!getTrack(selectedTrack.geometryId);

  const canStartBase = players.length > 0 && selectedTrackId !== null && selectedGeometryReady;

  // Filter racer types to those compatible with the selected track's surface classes.
  // Types with empty surfaceClasses are always included (native trail fallback).
  const filteredRacerTypeIds = useMemo(() => {
    const allTypes = listAllRacerTypes().filter((t) => t.isActive);
    if (!selectedTrack?.surfaceClasses?.length) return allTypes.map((t) => t.id);
    const filtered = filterRacerTypesForTrack(allTypes, selectedTrack.surfaceClasses, (id) =>
      getRacerType(id).getSurfaceClasses()
    );
    return filtered.map((t) => t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- racerTypeOverrides intentionally triggers recompute: listAllRacerTypes() reflects override isActive state (same RACER_TYPE_OVERRIDES storage), invisible to the deps analyzer
  }, [selectedTrack, racerTypeOverrides]);

  // Clear override if it's no longer compatible with the selected track's surface classes.
  useEffect(() => {
    if (racerTypeOverride && filteredRacerTypeIds.length > 0) {
      if (!filteredRacerTypeIds.includes(racerTypeOverride)) {
        setRacerTypeOverride(null);
      }
    }
  }, [filteredRacerTypeIds, racerTypeOverride]);

  // Track's surface classes as readable labels for the hint.
  const trackSurfaceLabel = useMemo(() => {
    if (!selectedTrack?.surfaceClasses?.length) return null;
    return selectedTrack.surfaceClasses
      .map((id) => id.charAt(0).toUpperCase() + id.slice(1))
      .join(', ');
  }, [selectedTrack]);

  // D7c: row-start hints — racersPerRow from actual geometry so large worlds are correct.
  // Uses effectiveWidth = geometricWidth × startSpreadRange (matches RaceScreen formula).
  const geometricRacersPerRow = useMemo(() => {
    if (!selectedTrack?.geometryId) return 8;
    const geom = getTrack(selectedTrack.geometryId);
    if (!geom) return 8;
    const shape = new EditorShape(geom);
    const racerType = getRacerType(selectedTrack.defaultRacerTypeId ?? 'horse');
    const displaySize = racerType?.config?.displaySize ?? 40;
    const effectiveWidth =
      (geom.width ?? shape.getActualTrackWidth()) * behaviorConfig.startSpreadRange;
    return computeRacersPerRow(effectiveWidth, displaySize);
  }, [selectedTrack, behaviorConfig]);

  const rowLayoutHints = useMemo(() => {
    const racersPerRow = geometricRacersPerRow;
    const totalRows = players.length > 0 ? Math.ceil(players.length / racersPerRow) : 1;
    const showRowHint = players.length > racersPerRow;
    const maxRacers = selectedTrack?.maxRacers ?? null;
    const showCapacityWarn = maxRacers !== null && players.length > maxRacers;
    return { racersPerRow, totalRows, showRowHint, maxRacers, showCapacityWarn };
  }, [players.length, selectedTrack, geometricRacersPerRow]);

  // Detect open/closed from the geometry's closed flag directly (isOpen = !closed)
  const trackIsOpen = useMemo(() => {
    if (!selectedTrack?.geometryId) return false;
    const geom = getTrack(selectedTrack.geometryId);
    return geom ? !geom.closed : false;
  }, [selectedTrack]);

  // PLAYER-GROUPS-1: the field cap, resolved ONCE. It was computed inline at the one place that
  // needed it; two components need it now, and two copies of a `??` chain is how they drift apart.
  // QUICKTEST-CAP-1 moved the `??` chain itself into `fieldCap.js`, because a THIRD caller appeared
  // — Quick Test, which needs the same answer for a different track — and the chain is where the
  // three named maxima could quietly become four again.
  const effectiveMaxPlayers = fieldCapFor(trackIsOpen, raceDefaults);

  // PLAYER-GROUPS-1: the roster split by group, for the start bar. One derivation, shared with the
  // Players tab, so the two can never disagree about who is in which group.
  const rosterSections = useMemo(() => sectionsOf(players), [players]);

  // ── A FIELD OVER THE CAP CANNOT BE STARTED (REFUSE-OVERSIZED-1, 2026-09-04) ──────────────────
  //
  // The group picker refuses a selection that would not fit, and the Add button has always stopped
  // at the cap — so the obvious reading is that an over-cap field is unreachable and this check is
  // dead. IT IS NOT, and the route is worth naming because nothing else on this screen watches it:
  //
  //   pick an OPEN track (cap 100) -> add 60 players -> pick a CLOSED track (cap 40).
  //
  // The roster does not change when the track does, so the field is now 60 against a cap of 40 and
  // no control was misused to get there. Refusing at the group picker alone would have left that
  // door open, and the failure would have arrived at the start line rather than while choosing.
  const overCap = players.length > effectiveMaxPlayers;
  // ── RACE-IDENTIFIER-3: PASTING THE IDENTIFIER IS ENOUGH ─────────────────────────────────────
  //
  // The owner's words: the racer list, the track and the lap count are inside the value, so he
  // should not have to select them again. He was right, and the Start button disagreed — `canStartBase`
  // demands a roster and a selected track, which the identifier supplies itself.
  //
  // ★ THE ONE THING IT CANNOT SUPPLY, and it is a real gap in the encoding rather than an oversight
  // here: THE TRACK'S GEOMETRY. The identifier carries the track's ID, not its shape — the shape is
  // kilobytes of spline and putting it in would multiply the length the owner is already deciding
  // about. So a race can only be reproduced on a device that HAS that track, and when it does not,
  // the screen says which track is missing rather than refusing silently.
  const pastedIdentifier = useMemo(() => {
    if (!looksLikeRaceIdentifier(raceSeed)) return null;
    try {
      const decoded = decodeRaceIdentifier(raceSeed, {
        defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
        buildId: raceIdentifierBuildId(),
      });
      const geometryHere = !!getTrack(decoded.geometryId);
      return { decoded, geometryHere, error: null };
    } catch (err) {
      return { decoded: null, geometryHere: false, error: err?.message ?? String(err) };
    }
  }, [raceSeed]);

  // With a usable identifier in the field the screen's own selection is irrelevant: everything the
  // race needs travels in the string, except the geometry, which must be on this device.
  const canStart = pastedIdentifier
    ? !!pastedIdentifier.decoded && pastedIdentifier.geometryHere
    : canStartBase && !overCap;

  // ── Canonical model inputs for the selected track ─────────────────────────────────────────
  // One normal speed (px/s) for every track; the race's PACE is that speed times the selected
  // racer type's multiplier. The setup screen only ever asks the model
  // (modules/durationModel.js) — it never re-derives a duration of its own.
  const normalSpeedPxPerSec = useMemo(() => normalSpeedFrom(loadBaseSpeedConfig()), []);
  const selectedPathLengthPx = useMemo(() => {
    if (!selectedTrack?.geometryId) return 0;
    return getTrack(selectedTrack.geometryId)?.pathLengthPx ?? 0;
  }, [selectedTrack]);

  const selectedSpeedMultiplier = useMemo(() => {
    if (!selectedTrack) return 1.0;
    return (
      getRacerType(
        racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
      )?.getSpeedMultiplier() ?? 1.0
    );
  }, [selectedTrack, racerTypeOverride]);

  // THE pace for this race, px/s — the one definition every duration figure below reads.
  const selectedPaceSpeed = useMemo(
    () => paceSpeedPxPerSec(normalSpeedPxPerSec, selectedSpeedMultiplier),
    [normalSpeedPxPerSec, selectedSpeedMultiplier]
  );

  // CLOSED: the operator picks laps. Default comes from the track (migrated from its old
  // defaultDuration); duration is derived, never chosen.
  const effectiveLaps = useMemo(
    () => selectedLaps ?? trackDefaultLaps(selectedTrack),
    [selectedLaps, selectedTrack]
  );

  // OPEN: the track's natural maximum AT THIS RACE'S PACE. Times beyond it stay selectable and
  // trigger the uniform slowdown, so the slider runs past this mark on purpose.
  const openNaturalMaxSec = useMemo(
    () =>
      selectedPathLengthPx
        ? naturalMaxSeconds(selectedPathLengthPx, selectedPaceSpeed, behaviorConfig.runoutZone)
        : 0,
    [selectedPathLengthPx, selectedPaceSpeed, behaviorConfig.runoutZone]
  );

  const effectiveOpenTrackDuration = useMemo(() => {
    if (!openNaturalMaxSec) return raceSettings.duration;
    if (openTrackDuration === null) {
      return trackDefaultSeconds(
        selectedTrack,
        selectedPathLengthPx,
        selectedPaceSpeed,
        behaviorConfig.runoutZone
      );
    }
    return Math.max(OPEN_TRACK_MIN_SECONDS, openTrackDuration);
  }, [
    openTrackDuration,
    openNaturalMaxSec,
    selectedTrack,
    selectedPathLengthPx,
    selectedPaceSpeed,
    behaviorConfig.runoutZone,
    raceSettings.duration,
  ]);

  // THE derived race for the current selection — the same call the race engine makes.
  const raceDurationModel = useMemo(() => {
    if (!selectedTrack || !selectedPathLengthPx) return null;
    return deriveRaceDuration({
      isOpen: trackIsOpen,
      pathLengthPx: selectedPathLengthPx,
      laps: effectiveLaps,
      requestedSeconds: effectiveOpenTrackDuration,
      normalSpeedPxPerSec,
      speedMultiplier: selectedSpeedMultiplier,
      runoutZone: behaviorConfig.runoutZone,
    });
  }, [
    selectedTrack,
    selectedPathLengthPx,
    selectedSpeedMultiplier,
    trackIsOpen,
    effectiveLaps,
    effectiveOpenTrackDuration,
    normalSpeedPxPerSec,
    behaviorConfig.runoutZone,
  ]);

  // Displayed estimate: the mean racer's derived duration, plus where the spread puts the
  // rest of the field. Display only — no engine term reads this.
  const durationEstimate = useMemo(() => {
    if (!raceDurationModel) return null;
    return fieldFinishWindow(
      raceDurationModel.realizedDurationSec,
      players.length,
      loadBaseSpeedConfig()
    );
  }, [raceDurationModel, players.length]);

  // The single duration figure shown in the setup UI and gated on.
  const estimatedDurationSec = raceDurationModel?.realizedDurationSec ?? raceSettings.duration;

  // The open-track slider runs past the natural maximum on purpose: asking for more time than
  // the track holds is a legal choice that trades pace for length (see the slowdown warning).
  const openSliderMaxSec = useMemo(
    () => Math.max(OPEN_TRACK_MIN_SECONDS + 1, Math.round(openNaturalMaxSec * 2)),
    [openNaturalMaxSec]
  );

  // Track selected for Quick Test (defaults to first track)
  const [quickTrackId, setQuickTrackId] = useState(null);
  const quickTrack = tracks.find((t) => t.id === (quickTrackId ?? tracks[0]?.id)) ?? tracks[0];
  // QUIET-FAILURES-1 — the same question for the Quick Test track. See `selectedGeometryReady`.
  const quickGeometryReady = !!quickTrack?.geometryId && !!getTrack(quickTrack.geometryId);
  // QUICKTEST-CAP-1: the Quick Test track's own open/closed flag, at RENDER time. `handleQuickTest`
  // already derived it from the geometry at click time; the cap has to be known before the click, to
  // clamp the N input and to refuse before the button is pressed rather than after.
  const quickTrackIsOpen = useMemo(() => {
    if (!quickTrack?.geometryId) return false;
    const geom = getTrack(quickTrack.geometryId);
    return geom ? !geom.closed : false;
  }, [quickTrack]);

  // THE SAME AUTHORITY THE NORMAL PATH READS — `maxPlayersOpen`/`maxPlayersClosed`, through the one
  // expression in `fieldCap.js`. Quick Test used to cap itself at a hardcoded 100 whatever the track
  // was, so a Quick Test at N=60 started on a track that holds 40: exactly the field the Start
  // button now refuses.
  const quickMaxPlayers = fieldCapFor(quickTrackIsOpen, raceDefaults);

  const [quickTestCount, setQuickTestCount] = useState(20);
  // Quick-Test seed field. EMPTY (the default) = draw a fresh random seed for each race: every race
  // differs — the normal Quick-Test case, zero input needed — yet each one stays replayable, because
  // it runs fully deterministic with the drawn seed and the HUD shows that value. Typing it back in
  // replays the race exactly.
  //
  // Held as a STRING so "empty" is representable; '' is not the same as 0 (0 would be the legacy
  // unseeded path, which Quick-Test can no longer reach — see quickTestSeed.js).
  //
  // Persisted for the browser session so a TYPED seed survives the remount that navigating back from
  // a race causes — otherwise the field would silently reset between the two runs being compared.
  // A drawn seed is deliberately NOT written back: the field must stay empty so the next race draws
  // again instead of pinning itself to the first drawn value.
  const [quickTestSeed, setQuickTestSeed] = useState(() =>
    sanitizeQuickTestSeedInput(sessionStorage.getItem('quickTestSeed') ?? '')
  );
  useEffect(() => {
    if (quickTestSeed === '') sessionStorage.removeItem('quickTestSeed');
    else sessionStorage.setItem('quickTestSeed', quickTestSeed);
  }, [quickTestSeed]);
  // Racer type selected for Quick Test (null = use quickTrack.defaultRacerTypeId)
  const [quickTestRacerTypeId, setQuickTestRacerTypeId] = useState(null);
  // QUICKTEST-NAMES-1: which roster Quick Test fills empty slots from. The default is the original
  // list, so a Quick Test nobody has touched produces exactly the race it always did — a racer's
  // name is an engine input, so this selector changes the RACE, not only the picture.
  const [quickTestNameSet, setQuickTestNameSet] = useState(DEFAULT_NAME_SET);

  // Surface-compatible racer types for the currently selected Quick Test track.
  // Same logic as filteredRacerTypeIds for the main SetupScreen selector.
  const quickCompatibleRacerTypeIds = useMemo(() => {
    const allTypes = listAllRacerTypes().filter((t) => t.isActive);
    if (!quickTrack?.surfaceClasses?.length) return allTypes.map((t) => t.id);
    const filtered = filterRacerTypesForTrack(allTypes, quickTrack.surfaceClasses, (id) =>
      getRacerType(id).getSurfaceClasses()
    );
    return filtered.map((t) => t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same as above — listAllRacerTypes() reflects racerTypeOverrides via shared storage
  }, [quickTrack, racerTypeOverrides]);

  // Reset racer selection when track changes and the selected type is no longer compatible.
  useEffect(() => {
    if (quickTestRacerTypeId && !quickCompatibleRacerTypeIds.includes(quickTestRacerTypeId)) {
      setQuickTestRacerTypeId(null);
    }
  }, [quickCompatibleRacerTypeIds, quickTestRacerTypeId]);

  // ── QUICK TEST OBEYS THE TRACK'S CAP (QUICKTEST-CAP-1, his decision 2026-09-04) ───────────────
  //
  // TWO HALVES, and they mirror the two the normal path already has, deliberately — he uses Quick
  // Test himself, so what he sees when a roster is too big must be what the setup screen shows him
  // and not a third treatment invented here.
  //
  //   THE INPUT STOPS AT THE CAP, the way PlayerSetup's Add button always has. Typing 60 on a track
  //   that holds 40 gives 40; the value cannot be reached, so it cannot be refused.
  //   AND THE FIELD IS STILL CHECKED, because the input is not the only door — the SAME route
  //   REFUSE-OVERSIZED-1 named for the normal path exists here and nothing else watches it:
  //
  //     pick an OPEN quick track (cap 100) -> set N to 60 -> pick a CLOSED quick track (cap 40).
  //
  //   N does not change when the track does, so the field is 60 against a cap of 40 with no control
  //   misused. The roster is a second such route: 60 players on screen start 60 whatever N says.
  //   Neither is silently corrected — a value quietly clamped on a track switch is the same fault as
  //   a name silently cut from a roster, and he chose being told over being tidied.
  const quickFieldSize = useMemo(
    () => quickTestFieldSize(players, quickTestCount, resolveNameSet(quickTestNameSet)),
    [players, quickTestCount, quickTestNameSet]
  );
  const quickOverCap = quickFieldSize > quickMaxPlayers;
  // Said once, so the notice, the button's tooltip and the console refusal cannot drift apart.
  const quickOverCapMessage = `${quickFieldSize} racers would start and this track allows ${quickMaxPlayers}. Lower N, remove ${quickFieldSize - quickMaxPlayers} from the roster, or pick a track that allows more.`;

  /**
   * RACE-IDENTIFIER-1 — start the race a string names, on this machine.
   *
   * Everything the payload needs comes from the decoded identifier. The fields that do NOT decide
   * the race — the event name, the branding, how many winners the result screen lists — still come
   * from this screen, because they are what this operator is showing tonight and reproducing a race
   * is not the same as reproducing somebody's poster.
   */
  // RACE-IDENTIFIER-1 — the identifier for the race this screen would start RIGHT NOW.
  //
  // Only defined for a TYPED seed: an empty field means "draw one at press time", so there is no
  // particular race to name yet and offering a string would be naming a race that does not exist.
  // Null while the field holds an identifier too — that string already IS the answer.
  //
  // ★ IT RETURNS A REASON, NEVER A BARE NULL (IDENTIFIER-SPEAKS-1, 2026-09-05). It used to return
  // `null` three different ways and the panel simply had no row, so an operator with racers, a track
  // and a typed seed had nothing to read and nothing to act on — the owner spent time on exactly
  // that. Worse, the third way was a `catch {}` that swallowed the throw whole: a screen state the
  // identifier could not describe looked identical to one where the row was never meant to appear.
  // That is the silent-zero shape this project has spent the week removing.
  //
  // So every path out of here carries `note`, which is what the panel shows where the row would have
  // been. `identifier` is still null in exactly the same states as before — nothing about WHEN a
  // string is offered has changed, only whether the screen says why it is not.
  const currentRaceIdentifier = useMemo(() => {
    const none = (note) => ({ identifier: null, note });
    if (looksLikeRaceIdentifier(raceSeed)) {
      // RACE-IDENTIFIER-3: a pasted identifier says what it WILL run, or why it cannot — the screen's
      // own track and roster no longer decide, so leaving the reader to guess is worse than before.
      if (pastedIdentifier?.error)
        return none(`This race identifier cannot be used: ${pastedIdentifier.error}`);
      if (pastedIdentifier && !pastedIdentifier.geometryHere)
        return none(
          `This race was run on a track this device does not have ("${pastedIdentifier.decoded.geometryId}"). ` +
            `Load that track and it will start — the identifier carries the track's ID, not its shape.`
        );
      const d = pastedIdentifier?.decoded;
      return none(
        d
          ? `Ready: this identifier runs ${d.names.length} racers on ${d.geometryId}, seed ${d.racePlanSeed}. It supplies the racers, the track and the settings — nothing on this screen is used.`
          : 'This field already holds a race identifier — that string is the race.'
      );
    }
    if (raceSeed === '')
      return none('Type a seed to get the identifier that repeats this exact race elsewhere.');
    if (!selectedGeometryReady)
      return none(
        'Pick a track whose geometry is loaded, and the identifier for this race appears here.'
      );
    if (players.length === 0)
      return none('Add at least one racer, and the identifier for this race appears here.');
    try {
      const preferredId = racerTypeOverride ?? selectedTrack?.defaultRacerTypeId ?? 'horse';
      const typeId = filteredRacerTypeIds.includes(preferredId)
        ? preferredId
        : (filteredRacerTypeIds[0] ?? preferredId);
      const stage = normalizeRaceActionStage(raceDefaults.raceActionStage);
      const identifier = encodeRaceIdentifier({
        geometryId: selectedTrack?.geometryId,
        racerTypeId: typeId,
        names: players.map((p) => p.name),
        racePlanSeed: Number(raceSeed),
        raceActionStage: stage,
        targetLaps: trackIsOpen ? undefined : effectiveLaps,
        targetDurationSec: trackIsOpen ? effectiveOpenTrackDuration : undefined,
        // Derived exactly as the start path derives it, from the same model.
        racePlanEnabled:
          deriveRaceDuration({
            isOpen: trackIsOpen,
            pathLengthPx: selectedPathLengthPx,
            laps: effectiveLaps,
            requestedSeconds: effectiveOpenTrackDuration,
            normalSpeedPxPerSec,
            speedMultiplier: getRacerType(typeId)?.getSpeedMultiplier() ?? 1.0,
            runoutZone: behaviorConfig.runoutZone,
          }).realizedDurationSec >= racePlanMinDur,
        world: buildWorldConfig({ raceActionStage: stage }),
        defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
        buildId: raceIdentifierBuildId(),
      });
      return { identifier, note: null };
    } catch (err) {
      // ★ THE FAILURE SPEAKS. A screen state an identifier cannot describe must not take the panel
      // down with it — that part of the original comment was right and the catch stays. What it must
      // ALSO not do is vanish: without the message below, a throw here and a deliberately absent row
      // are the same blank space, and the only way to tell them apart is to open a console.
      //
      // The message names the ERROR, because the state that produced it lives in this operator's own
      // stored settings and cannot be guessed from anywhere else — it is the one fact a person
      // reading the screen has that nobody else does.
      console.warn('[setup] the race identifier could not be built for this screen state:', err);
      return none(
        `This race cannot be turned into an identifier: ${err?.message ?? String(err)}. ` +
          `The race itself still starts normally. Restoring the shipped settings on the Dev Screen ` +
          `is what makes a race describable again.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    raceSeed,
    selectedGeometryReady,
    selectedTrack,
    players,
    racerTypeOverride,
    filteredRacerTypeIds,
    raceDefaults.raceActionStage,
    trackIsOpen,
    effectiveLaps,
    effectiveOpenTrackDuration,
    selectedPathLengthPx,
    normalSpeedPxPerSec,
    racePlanMinDur,
  ]);

  function startRaceFromIdentifier(text) {
    // The SAME decode the Start button was enabled on — see `pastedIdentifier`. Decoding a second
    // time here would let the gate and the run disagree about the same string.
    const parsed =
      pastedIdentifier ??
      (() => {
        try {
          return {
            decoded: decodeRaceIdentifier(text, {
              defaultWorldConfigs: DEFAULT_CONFIG_WORLD,
              buildId: raceIdentifierBuildId(),
            }),
            error: null,
          };
        } catch (err) {
          return { decoded: null, error: err?.message ?? String(err) };
        }
      })();
    if (!parsed.decoded) {
      setIdentifierError(parsed.error ?? 'This race identifier could not be read.');
      return;
    }
    const decoded = parsed.decoded;
    const geom = getTrack(decoded.geometryId);
    if (!geom) {
      // The one input an identifier cannot carry: the track's own geometry lives on this machine.
      // Refusing is the honest answer — racing a track this client does not have would guess.
      setIdentifierError(
        `This race was run on a track this device does not have ("${decoded.geometryId}"). Load that track, then try again.`
      );
      return;
    }
    setIdentifierError(null);
    const track = tracks.find((t) => t.geometryId === decoded.geometryId) ?? null;
    const race = {
      // The roster IS the name list, in order — a name is physics, so this cannot be rebuilt from
      // whoever is in the lobby right now.
      racers: decoded.names.map((name) => ({ name })),
      trackId: track?.id ?? decoded.geometryId,
      trackName: track?.name ?? decoded.geometryId,
      geometryId: decoded.geometryId,
      racerTypeId: decoded.racerTypeId,
      worldWidth: track?.worldWidth ?? 1280,
      worldHeight: track?.worldHeight ?? 720,
      duration: raceSettings.duration,
      eventName: raceSettings.eventName,
      subtitle: activeBrandProfile?.subtitle ?? '',
      sponsorText: activeBrandProfile?.sponsorText ?? '',
      winners: raceSettings.winners,
      raceMode: decoded.targetDurationSec == null ? 'laps' : 'time',
      targetLaps: decoded.targetLaps,
      targetDurationSec: decoded.targetDurationSec,
      trackSurfaceClasses: track?.surfaceClasses ?? [],
      racePlanEnabled: decoded.racePlanEnabled,
      racePlanSeed: decoded.racePlanSeed,
      raceActionStage: decoded.raceActionStage,
      // ★ The half a seed never carried: the config world this race was recorded with. RaceScreen
      // prefers it over this machine's stored config — see the note at `RaceScreen/index.jsx:466`.
      worldConfigOverride: decoded.world,
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    // A race started FROM an identifier really ran, so it becomes the last race like any other —
    // and its identifier is the string that started it, which needs no re-encoding.
    rememberStartedRace(race, text.trim());
    navigate('/race');
  }

  function handleStartRace() {
    // ── RACE-IDENTIFIER-1: the field may hold a whole race rather than a seed ──────────────────
    //
    // An identifier carries all nine engine inputs, so a race started from one takes NOTHING from
    // this screen's current selection — not the track, not the racer type, not the roster, and not
    // this machine's stored config. That is the entire point: the same string on two machines is
    // the same race, which a seed alone has never been able to promise.
    //
    // It REFUSES rather than falls back. A damaged or foreign identifier that quietly started the
    // race the screen happens to be showing would be the worst outcome available — a race claiming
    // to be the one in the string.
    if (looksLikeRaceIdentifier(raceSeed)) {
      startRaceFromIdentifier(raceSeed);
      return;
    }
    // QUIET-FAILURES-1 — the same refusal as Quick Test, for the same reason: `trackIsOpen`
    // resolves a missing geometry to CLOSED, and `raceMode` below is derived straight from it.
    if (!selectedGeometryReady) {
      console.warn(
        `[setup] Start refused: the geometry for "${selectedTrack?.name ?? selectedTrackId}" is not available, so whether this track is open or closed is UNKNOWN — racing would have guessed CLOSED and run a laps race`
      );
      return;
    }
    const preferredId = racerTypeOverride ?? selectedTrack?.defaultRacerTypeId ?? 'horse';
    const effectiveTypeId = filteredRacerTypeIds.includes(preferredId)
      ? preferredId
      : (filteredRacerTypeIds[0] ?? preferredId);
    // THE canonical derivation, evaluated with the racer type the race will actually run.
    // The engine re-derives it from the same inputs and gets the identical scalars.
    const startModel = deriveRaceDuration({
      isOpen: trackIsOpen,
      pathLengthPx: selectedPathLengthPx,
      laps: effectiveLaps,
      requestedSeconds: effectiveOpenTrackDuration,
      normalSpeedPxPerSec,
      speedMultiplier: getRacerType(effectiveTypeId)?.getSpeedMultiplier() ?? 1.0,
      runoutZone: behaviorConfig.runoutZone,
    });
    const realizedDurationSec = startModel.realizedDurationSec;
    // Resolved before the payload is built so the SAME value goes into the race and into the
    // last-race record — one draw, two consumers, no chance of them disagreeing.
    const startSeed = resolveQuickTestSeed(raceSeed).seed;
    const race = {
      racers: players,
      trackId: selectedTrackId,
      trackName: selectedTrack?.name,
      geometryId: selectedTrack?.geometryId ?? null,
      racerTypeId: effectiveTypeId,
      worldWidth: selectedTrack?.worldWidth ?? 1280,
      worldHeight: selectedTrack?.worldHeight ?? 720,
      duration: raceSettings.duration,
      eventName: raceSettings.eventName,
      subtitle: activeBrandProfile?.subtitle ?? '',
      sponsorText: activeBrandProfile?.sponsorText ?? '',
      winners: raceSettings.winners,
      raceMode: trackIsOpen ? 'time' : 'laps',
      // The two canonical operator inputs. Exactly one is meaningful per race mode; the engine
      // re-derives everything else from them, so no derived scalar travels in this payload as
      // an engine input (realizedDurationSec below is carried for display/telemetry only).
      targetLaps: trackIsOpen ? undefined : effectiveLaps,
      targetDurationSec: trackIsOpen ? effectiveOpenTrackDuration : undefined,
      realizedDurationSec,
      paceScale: startModel.paceScale,
      trackSurfaceClasses: selectedTrack?.surfaceClasses ?? [],
      racePlanEnabled: realizedDurationSec >= racePlanMinDur,
      // SEED-REAL-RACE-1. Was a hardcoded 0 — the unseeded path — until 2026-08-23. The draw
      // happens HERE, once, before the race exists, so the race itself is a pure function of the
      // value that travels in this payload.
      racePlanSeed: startSeed,
      // RACE-ACTION-CONTROL-1: the host's Race Action stage travels WITH the race, exactly like the
      // seed above and for the same reason — a race that cannot say which stage it ran cannot be
      // replayed. Normalised at the boundary so the payload always carries one of the three ids.
      raceActionStage: normalizeRaceActionStage(raceDefaults.raceActionStage),
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem('activeRace', JSON.stringify(race));
    // The seed this race RAN with, in a store that survives the tab closing. Written for a drawn
    // seed as well as a typed one — the drawn case is the whole reason the key exists, because the
    // field stays empty and would otherwise be the only record.
    rememberStartedRace(race);
    navigate('/race');
  }

  function handleQuickTest() {
    const track = quickTrack;
    if (!track || !track.geometryId) return;

    // QUIET-FAILURES-1 — the refusal, repeated here rather than trusted to the disabled button.
    // The button is the guard a person sees; this is the guard that holds if the geometry is
    // evicted between render and click. Racing on a guessed open/closed flag is the one outcome
    // that must be impossible, because the guess IS the race mode.
    const geom = getTrack(track.geometryId);
    if (!geom) {
      console.warn(
        `[setup] Quick Test refused: the geometry for "${track.name ?? track.id}" is not available, so whether this track is open or closed is UNKNOWN — racing would have guessed CLOSED and run a laps race`
      );
      return;
    }

    const quickIsOpen = !geom.closed;

    // QUICKTEST-CAP-1 — the refusal, repeated here rather than trusted to the disabled button, for
    // the same reason the geometry check above is: the button is the guard a person sees, this is
    // the guard that holds if the roster or the track changes between render and click. Reading the
    // cap off `geom` rather than off `quickMaxPlayers` keeps this branch honest even then.
    const clickCap = fieldCapFor(quickIsOpen, raceDefaults);
    const clickField = quickTestFieldSize(
      players,
      quickTestCount,
      resolveNameSet(quickTestNameSet)
    );
    if (clickField > clickCap) {
      console.warn(
        `[setup] Quick Test refused: ${clickField} racers would start on "${track.name ?? track.id}" and it allows ${clickCap}`
      );
      return;
    }

    const defaultTypeId = track.defaultRacerTypeId || 'horse';
    // Use the Quick Test racer selector; fall back to track default (backward-compatible).
    const effectiveTypeId =
      quickTestRacerTypeId && quickCompatibleRacerTypeIds.includes(quickTestRacerTypeId)
        ? quickTestRacerTypeId
        : defaultTypeId;

    const needed = Math.max(0, quickTestCount - players.length);
    const existingNames = new Set(players.map((p) => p.name));
    const fillNames = resolveNameSet(quickTestNameSet)
      .filter((n) => !existingNames.has(n))
      .slice(0, needed);
    const testPlayers = [...players, ...fillNames.map((name) => ({ name }))];

    // Quick Test runs the track's own canonical defaults: its lap count (closed) or its
    // clamped default seconds (open) — the same inputs the sim CLI takes, so any Quick-Test
    // race is expressible as a sim invocation.
    const quickGeom = track.geometryId ? getTrack(track.geometryId) : null;
    const quickPathLengthPx = quickGeom?.pathLengthPx ?? 0;
    const quickLaps = trackDefaultLaps(track);
    // The default seconds are clamped at THIS race's pace, so the Quick-Test type's own
    // multiplier decides the ceiling — not the track's default type.
    const quickSpeedMultiplier = getRacerType(effectiveTypeId)?.getSpeedMultiplier() ?? 1.0;
    const quickSeconds = trackDefaultSeconds(
      track,
      quickPathLengthPx,
      paceSpeedPxPerSec(normalSpeedPxPerSec, quickSpeedMultiplier),
      behaviorConfig.runoutZone
    );
    const quickModel = deriveRaceDuration({
      isOpen: quickIsOpen,
      pathLengthPx: quickPathLengthPx,
      laps: quickLaps,
      requestedSeconds: quickSeconds,
      normalSpeedPxPerSec,
      speedMultiplier: quickSpeedMultiplier,
      runoutZone: behaviorConfig.runoutZone,
    });
    const quickRealizedDurationSec = quickModel.realizedDurationSec;
    const race = {
      racers: testPlayers,
      trackId: track.id,
      trackName: track.name,
      geometryId: track.geometryId ?? null,
      racerTypeId: effectiveTypeId,
      worldWidth: track.worldWidth ?? 1280,
      worldHeight: track.worldHeight ?? 720,
      duration: raceDefaults.duration,
      eventName: 'Quick Test',
      winners: raceDefaults.winners,
      raceMode: quickIsOpen ? 'time' : 'laps',
      targetLaps: quickIsOpen ? undefined : quickLaps,
      targetDurationSec: quickIsOpen ? quickSeconds : undefined,
      realizedDurationSec: quickRealizedDurationSec,
      paceScale: quickModel.paceScale,
      trackSurfaceClasses: track.surfaceClasses ?? [],
      racePlanEnabled: quickRealizedDurationSec >= racePlanMinDur,
      // Empty field ⇒ a seed is drawn here, once, BEFORE the race starts — the race itself is then
      // a pure function of it (RaceScreen seeds Math.random from this value). The drawn seed is not
      // written back into the field, so the next Quick-Test draws a fresh one.
      racePlanSeed: resolveQuickTestSeed(quickTestSeed).seed,
      // RACE-ACTION-CONTROL-1 — the same stage the normal path carries. Quick Test is the harness
      // path the camera-replay tool records against, so leaving it out would make a Quick-Test
      // recording silently un-replayable the moment the host is on a non-quiet stage.
      raceActionStage: normalizeRaceActionStage(raceDefaults.raceActionStage),
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem('activeRace', JSON.stringify(race));
    navigate('/race');
  }

  return (
    <div className={styles.screen}>
      {/* SEED-REDELIVERY-1: renders nothing unless this install is owed a warning. */}
      <SeedRedeliveryNotice />
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <div className={styles.logo}>
            Race<span>Arena</span>
          </div>
          {raceSettings.eventName && (
            <div
              style={{
                position: 'relative',
                paddingLeft: '0.85rem',
                borderLeft: '0.5px solid rgba(255,255,255,0.12)',
                lineHeight: 1,
                minWidth: 0,
                maxWidth: '28ch',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: activeBrandProfile ? 'var(--brand-primary)' : 'var(--color-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {raceSettings.eventName}
              </span>
              {activeBrandProfile?.subtitle && (
                <span
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 2px)',
                    left: '0.85rem',
                    right: 0,
                    fontSize: '0.72rem',
                    color: 'var(--brand-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeBrandProfile.subtitle}
                </span>
              )}
            </div>
          )}
        </div>
        {brandingProfiles.length > 0 && (
          <select
            value={activeSession?.activeBrandingProfileId ?? ''}
            onChange={(e) => {
              const id = e.target.value || null;
              setActiveSession({ activeBrandingProfileId: id });
            }}
            style={{
              fontSize: '0.8rem',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-muted)',
              borderRadius: 'var(--radius)',
              padding: '0.15rem 0.4rem',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
            aria-label="Active branding profile"
          >
            <option value="">Branding: None</option>
            {brandingProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {/* Gear icon — always visible, opens the Dev Panel */}
        <Link
          to="/dev"
          title="Open Dev Panel"
          style={{
            fontSize: '1.2rem',
            color: 'var(--color-muted)',
            textDecoration: 'none',
            padding: '0.25rem 0.5rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
        >
          ⚙️
        </Link>
      </header>

      <main className={styles.body}>
        {/* Tab navigation */}
        <nav className={styles.tabs} role="tablist">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === i}
              className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
              {tab === 'Players' && players.length > 0 && (
                <span
                  style={{
                    marginLeft: '0.4rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  {players.length}
                </span>
              )}
              {tab === 'Track' && selectedTrack && (
                <span
                  style={{
                    marginLeft: '0.4rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  {getRacerType(
                    racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                  ).getEmoji()}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Active tab panel */}
        <section className={styles.panel}>
          {activeTab === 0 && (
            <>
              <h2 className={styles.panelTitle}>Players</h2>
              {/* PLAYER-GROUPS-1: the picker sits ABOVE the name input, because filling the field
                  from a saved group is the common case and typing thirty names is not. It writes
                  into the SAME roster the input below writes into — there is one field, and both
                  doors lead to it. */}
              <PlayerGroupPicker
                players={players}
                onChange={setPlayers}
                maxPlayers={effectiveMaxPlayers}
              />
              <PlayerSetup
                players={players}
                onChange={setPlayers}
                maxPlayers={effectiveMaxPlayers}
              />
            </>
          )}
          {activeTab === 1 && (
            <>
              <h2 className={styles.panelTitle}>Select Track</h2>
              <TrackSelector
                tracks={tracks}
                selectedTrackId={selectedTrackId}
                onChange={setSelectedTrackId}
              />
              {selectedTrack && (
                <div
                  style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-muted)',
                        display: 'block',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Racer type for this race
                    </label>
                    <select
                      data-testid="racer-type-select"
                      value={
                        filteredRacerTypeIds.includes(
                          racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                        )
                          ? (racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse')
                          : (filteredRacerTypeIds[0] ?? 'horse')
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setRacerTypeOverride(
                          val === (selectedTrack.defaultRacerTypeId ?? 'horse') ? null : val
                        );
                      }}
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {filteredRacerTypeIds.map((id) => (
                        <option key={id} value={id}>
                          {getRacerTypeLabel(id)}
                          {id === (selectedTrack.defaultRacerTypeId ?? 'horse') ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                    {trackSurfaceLabel && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--color-muted)',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                        data-testid="track-surface-hint"
                      >
                        Surface: {trackSurfaceLabel}
                      </span>
                    )}
                  </div>

                  {trackIsOpen ? (
                    <div>
                      <label
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-muted)',
                          display: 'block',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Race Duration
                      </label>
                      {openNaturalMaxSec > 0 ? (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--color-muted)',
                                minWidth: '3.5rem',
                              }}
                            >
                              Total race duration
                            </span>
                            <input
                              data-testid="open-track-duration-slider"
                              type="range"
                              min={OPEN_TRACK_MIN_SECONDS}
                              max={openSliderMaxSec}
                              value={effectiveOpenTrackDuration}
                              onChange={(e) => setOpenTrackDuration(Number(e.target.value))}
                              style={{
                                flex: 1,
                                cursor: 'pointer',
                                accentColor: 'var(--color-accent)',
                              }}
                              title="Choose the total race duration. Up to the track's natural maximum the field runs at normal speed and the finish line moves; beyond it the finish line is fixed and the whole field is slowed so the chosen time fits."
                            />
                            <span
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-text)',
                                minWidth: '2.5rem',
                                textAlign: 'right',
                              }}
                            >
                              {effectiveOpenTrackDuration}s
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.72rem',
                              color: 'var(--color-muted)',
                            }}
                          >
                            <span data-testid="open-track-natural-max">
                              Natural maximum at normal speed: {Math.floor(openNaturalMaxSec)}s
                            </span>
                            <span data-testid="open-track-estimated-duration">
                              Estimated duration: {Math.round(estimatedDurationSec)}s
                              {durationEstimate
                                ? ` (field ${Math.round(durationEstimate.firstSec)}–${Math.round(durationEstimate.lastSec)}s)`
                                : ''}
                            </span>
                          </div>
                          {raceDurationModel?.slowdownActive && (
                            <div
                              data-testid="open-track-slowdown-warning"
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--color-warning, #f5a623)',
                                marginTop: '0.25rem',
                              }}
                            >
                              ⚠️ Beyond this track&apos;s natural maximum of{' '}
                              {Math.floor(openNaturalMaxSec)}s — the whole field runs at{' '}
                              <strong>{Math.round(raceDurationModel.paceScale * 100)}%</strong> of
                              normal pace so the race lasts {effectiveOpenTrackDuration}s.
                            </div>
                          )}
                          {estimatedDurationSec < racePlanMinDur && (
                            <div
                              data-testid="race-plan-inactive-warning"
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--color-warning, #f5a623)',
                                marginTop: '0.25rem',
                              }}
                            >
                              ⚠️ Race Plan inactive below {racePlanMinDur}s
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                          Draw a track geometry to unlock duration settings.
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-muted)',
                          display: 'block',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Laps
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {LAP_CHOICES.map((n) => {
                          const isSelected = effectiveLaps === n;
                          const secs = selectedPathLengthPx
                            ? Math.round(secondsForLaps(n, selectedPathLengthPx, selectedPaceSpeed))
                            : null;
                          return (
                            <button
                              key={n}
                              data-testid={`lap-choice-${n}`}
                              onClick={() => setSelectedLaps(n)}
                              title={secs !== null ? `~${secs}s at normal speed` : undefined}
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.85rem',
                                border: `1px solid ${isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)'}`,
                                borderRadius: '4px',
                                background: isSelected
                                  ? 'rgba(var(--color-accent-rgb, 68,136,255),0.18)'
                                  : 'transparent',
                                color: isSelected ? 'var(--color-accent)' : 'var(--color-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {n}
                              {n === trackDefaultLaps(selectedTrack) ? '*' : ''}
                            </button>
                          );
                        })}
                      </div>
                      <span
                        data-testid="closed-track-estimated-duration"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-muted)',
                          marginTop: '0.25rem',
                          display: 'block',
                        }}
                      >
                        * track default · Estimated duration: {Math.round(estimatedDurationSec)}s
                        {durationEstimate
                          ? ` (field ${Math.round(durationEstimate.firstSec)}–${Math.round(durationEstimate.lastSec)}s)`
                          : ''}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--color-muted)',
                          marginTop: '0.15rem',
                          display: 'block',
                        }}
                      >
                        Duration is derived from track length, laps and the normal speed — the
                        shortest closed race is one lap.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {activeTab === 2 && (
            <>
              <h2 className={styles.panelTitle}>Race Settings</h2>
              <RaceSettings
                settings={raceSettings}
                onChange={setRaceSettings}
                seed={raceSeed}
                onSeedChange={setRaceSeed}
                lastRaceSeed={lastRaceSeed}
                lastRaceIdentifier={lastRaceIdentifier}
                identifierError={identifierError}
                raceIdentifier={currentRaceIdentifier.identifier}
                raceIdentifierNote={currentRaceIdentifier.note}
              />
            </>
          )}
        </section>

        {/* Start bar — always visible at the bottom */}
        <div className={styles.startBar}>
          {rowLayoutHints.showRowHint && (
            <div
              data-testid="row-start-hint"
              style={{
                fontSize: '0.78rem',
                color: 'var(--color-muted)',
                padding: '0.2rem 0',
              }}
            >
              ℹ️ {players.length} players will start in {rowLayoutHints.totalRows} rows
            </div>
          )}
          {/* REFUSE-OVERSIZED-1: the HARD cap, said where the Start button is, in the warning
              treatment CHIP-CONTRAST-1 established rather than a third presentation of its own.
              It sits ABOVE the track's soft `capacity-warning` below, which is a different claim —
              that one says the race may feel cramped, this one says it cannot start. */}
          {overCap && (
            <p role="alert" data-testid="over-cap-refusal" className={styles.groupNotice}>
              <span aria-hidden="true">⚠️</span>
              <span>
                <strong>{players.length}</strong> racers are in the field and this track allows{' '}
                <strong>{effectiveMaxPlayers}</strong>. Remove{' '}
                <strong>{players.length - effectiveMaxPlayers}</strong>, or pick a track that allows
                more.
              </span>
            </p>
          )}
          {rowLayoutHints.showCapacityWarn && (
            <div
              data-testid="capacity-warning"
              style={{
                fontSize: '0.78rem',
                color: '#f4a261',
                padding: '0.2rem 0',
              }}
            >
              ⚠️ This track recommends a maximum of {rowLayoutHints.maxRacers} racers — you have{' '}
              {players.length}. The race will still start but may feel cramped.
            </div>
          )}
          <div className={styles.startSummary}>
            <strong>{players.length}</strong> player{players.length !== 1 ? 's' : ''}
            {/* PLAYER-GROUPS-1: WHO is racing, not just how many. The start bar is the last thing
                read before the gun and it is where a wrong field is still cheap to fix. */}
            {rosterSections.length > 1 && (
              <span className={styles.startSummaryGroups} data-testid="start-summary-groups">
                {' ('}
                {rosterSections.map((s) => `${s.label} ${s.members.length}`).join(' + ')}
                {')'}
              </span>
            )}{' '}
            ·{' '}
            {selectedTrack ? (
              <strong>
                {getRacerType(
                  racerTypeOverride ?? selectedTrack.defaultRacerTypeId ?? 'horse'
                ).getEmoji()}{' '}
                {selectedTrack.name}
              </strong>
            ) : (
              'No track selected'
            )}{' '}
            {selectedTrack && !trackIsOpen ? (
              <>
                {' '}
                ·{' '}
                <strong>
                  {effectiveLaps} lap{effectiveLaps !== 1 ? 's' : ''} · ~
                  {Math.round(estimatedDurationSec)}s
                </strong>
              </>
            ) : (
              <>
                {' '}
                ·{' '}
                <strong>{trackIsOpen ? effectiveOpenTrackDuration : raceSettings.duration}s</strong>
              </>
            )}{' '}
            · Top <strong>{raceSettings.winners}</strong>
          </div>
          <div className={styles.startButtons}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'flex-start',
              }}
            >
              {/* Track switcher for Quick Test */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setQuickTrackId(t.id)}
                    title={t.name}
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      border: `1px solid ${(quickTrack?.id ?? tracks[0]?.id) === t.id ? t.color : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '4px',
                      background:
                        (quickTrack?.id ?? tracks[0]?.id) === t.id ? `${t.color}33` : 'transparent',
                      color: (quickTrack?.id ?? tracks[0]?.id) === t.id ? t.color : '#aaa',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {getRacerType(t.defaultRacerTypeId ?? 'horse').getEmoji()} {t.name}
                  </button>
                ))}
              </div>
              {/* Racer selector for Quick Test — surface-compatible types only */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  Racer:
                  <select
                    data-testid="quick-test-racer-select"
                    value={
                      quickCompatibleRacerTypeIds.includes(
                        quickTestRacerTypeId ?? quickTrack?.defaultRacerTypeId ?? 'horse'
                      )
                        ? (quickTestRacerTypeId ?? quickTrack?.defaultRacerTypeId ?? 'horse')
                        : (quickCompatibleRacerTypeIds[0] ?? 'horse')
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickTestRacerTypeId(
                        val === (quickTrack?.defaultRacerTypeId ?? 'horse') ? null : val
                      );
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '1px 4px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {quickCompatibleRacerTypeIds.map((id) => (
                      <option key={id} value={id}>
                        {getRacerType(id).getEmoji()} {getRacerTypeLabel(id)}
                        {id === (quickTrack?.defaultRacerTypeId ?? 'horse') ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {/* QUICKTEST-NAMES-1: the roster Quick Test fills empty slots from. A label box is
                    as wide as the name inside it, so this is the control that sets the
                    start-formation geometry — and because a racer's name is an engine input, it
                    changes the RACE too, exactly as editing the roster would. Default = original. */}
                <label
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title="Which roster fills empty Quick Test slots. Names are an engine input - changing this changes the race, not only the labels."
                >
                  Names:
                  <select
                    data-testid="quick-test-nameset-select"
                    value={quickTestNameSet}
                    onChange={(e) => setQuickTestNameSet(e.target.value)}
                    style={{
                      fontSize: '11px',
                      padding: '1px 4px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="current">current (default)</option>
                    <option value="long">long</option>
                    <option value="mixed">mixed</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  N:
                  {/* QUICKTEST-CAP-1: the ceiling is the TRACK's, not a hardcoded 100. The clamp is
                      the enforcing one — a browser treats `max` on a number input as advice when a
                      value is typed — and it mirrors PlayerSetup's Add button, which has always
                      stopped at the cap rather than accepting and then refusing. */}
                  <input
                    type="number"
                    min={1}
                    max={quickMaxPlayers}
                    value={quickTestCount}
                    onChange={(e) =>
                      setQuickTestCount(
                        Math.max(1, Math.min(quickMaxPlayers, Number(e.target.value) || 1))
                      )
                    }
                    style={{
                      width: '46px',
                      fontSize: '11px',
                      padding: '1px 4px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      color: 'inherit',
                      textAlign: 'right',
                    }}
                  />
                </label>
                <label
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  Seed:
                  {/* Text + numeric keypad rather than type="number": an empty field is a real,
                      meaningful state here ("random"), and number inputs make emptiness awkward. */}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="random"
                    title={`Leave empty for a fresh random seed each race (shown in the race HUD, so you can replay it). Type ${QUICK_TEST_SEED_MIN}–${QUICK_TEST_SEED_MAX} to fix the race.`}
                    value={quickTestSeed}
                    onChange={(e) => setQuickTestSeed(sanitizeQuickTestSeedInput(e.target.value))}
                    style={{
                      width: '52px',
                      fontSize: '11px',
                      padding: '1px 4px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '3px',
                      color: 'inherit',
                      textAlign: 'right',
                    }}
                  />
                </label>
              </div>
              {/* QUICKTEST-CAP-1: the HARD cap, said where the Quick Test button is, in the same
                  warning treatment the Start button's refusal uses — numbers and the way out, never
                  names. */}
              {quickOverCap && (
                <p role="alert" data-testid="quick-over-cap-refusal" className={styles.groupNotice}>
                  <span aria-hidden="true">⚠️</span>
                  <span>{quickOverCapMessage}</span>
                </p>
              )}
              <button
                className={styles.quickTestBtn}
                onClick={handleQuickTest}
                disabled={!quickGeometryReady || quickOverCap}
                title={
                  quickOverCap
                    ? quickOverCapMessage
                    : quickGeometryReady
                      ? `Auto-fill to ${quickTestCount} test players and start race`
                      : quickTrack?.geometryId
                        ? // QUIET-FAILURES-1: named, not guessed. The track exists; its geometry does not.
                          'This track’s geometry could not be loaded from the server, so whether it is open or closed is unknown. Check the server and reload — racing now would guess.'
                        : 'Draw a track in the Track Editor first'
                }
              >
                ⚡ Quick Test ({quickTestCount})
              </button>
            </div>
            <button
              className={styles.startBtn}
              data-testid="start-race"
              disabled={!canStart}
              onClick={handleStartRace}
              title={
                canStart
                  ? 'Start the race!'
                  : // QUIET-FAILURES-1: the old single message blamed the operator for a server
                    // failure. Separate the two so the cause is the one that is actually true.
                    selectedTrack?.geometryId && !selectedGeometryReady
                    ? 'This track’s geometry could not be loaded from the server, so whether it is open or closed is unknown. Check the server and reload — racing now would guess.'
                    : overCap
                      ? // REFUSE-OVERSIZED-1: numbers, and the way out. Never names.
                        `${players.length} racers are in the field and this track allows ${effectiveMaxPlayers}. Remove ${players.length - effectiveMaxPlayers}, or pick a track that allows more.`
                      : 'Add at least one player and select a track to start'
              }
            >
              Start Race →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SetupScreen;
