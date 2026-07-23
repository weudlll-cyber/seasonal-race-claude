// ============================================================
// File:        DiagnoseVerteilung.jsx
// Path:        client/src/screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx
// Project:     RaceArena
// Description: Hidden diagnostic route /diagnose-verteilung.
//              Runs 50 headless race simulations and reports the empirical
//              distribution of "racers side by side" after 4 seconds RACING time.
//              Part of Phase-1 inventory measurement (feature/priority-system).
//              Internal diagnose tool — accessible only via direct URL. Not linked
//              from main UI. Intentionally kept; do not delete.
// ============================================================

import { useState, useRef, useCallback } from 'react';
import {
  simulateRace,
  secondsToFrames,
  DIRT_OVAL_PATH_LENGTH_PX,
} from '../../modules/headlessRaceSimulator.js';
import { getInitialTracks } from '../../modules/storage/trackLoader.js';
import { secondsForLaps, trackDefaultLaps, normalSpeedFrom } from '../../modules/durationModel.js';
import { avg, median, p95, stddev } from '../../modules/statsHelpers.js';
import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import { loadRowLayoutConfig } from '../../modules/rowLayoutConfig.js';
import { loadRaceDynamicsConfig } from '../../modules/raceDynamicsConfig.js';
import { loadAutoScaleConfig } from '../../modules/autoSpriteScale.js';
import { RACER_TYPES, RACER_TYPE_LABELS } from '../../modules/racer-types/index.js';
import { storageGet, KEYS } from '../../modules/storage/storage.js';

const N_RUNS = 50;
const N_RACERS = 40;
const SPRITE_SIZE = 40;
const CHUNK_SIZE = 5; // races per animation frame

// Closed-track list built from the same cached source as the game (sync, localStorage-backed).
// Tracks with no geometryId or open geometry are excluded. Empty when server not yet fetched.
const CLOSED_TRACKS = getInitialTracks().filter((t) => t.geometryId != null && t.closed === true);

// Per-track live-racing cap: the second the fastest racer reaches finishT, minus 1 s buffer.
// Reads the canonical model — the derived race duration for the track's default lap count —
// and divides by the fastest expected spread factor to get the leader's arrival.
function computeTrackCap(track, bsc) {
  const { min: MIN, max: MAX } = bsc;
  const MEAN = (MIN + MAX) / 2;
  const sxf = MAX / MEAN;
  const derived = secondsForLaps(trackDefaultLaps(track), track.pathLengthPx, normalSpeedFrom(bsc));
  return Math.max(5, Math.floor(derived / sxf) - 1);
}

// ── ASCII histogram ────────────────────────────────────────────────────────────
function AsciiHistogram({ histogram, nRuns }) {
  const entries = Object.entries(histogram)
    .map(([k, v]) => ({ val: Number(k), count: v }))
    .sort((a, b) => a.val - b.val);
  if (entries.length === 0) return null;
  const maxCount = Math.max(...entries.map((e) => e.count));
  const BAR_WIDTH = 28;
  const lines = entries.map(({ val, count }) => {
    const barLen = Math.round((count / maxCount) * BAR_WIDTH);
    const bar = '█'.repeat(barLen) + '░'.repeat(BAR_WIDTH - barLen);
    const pct = ((count / nRuns) * 100).toFixed(0).padStart(3);
    return `  ${String(val).padStart(2)} │ ${bar} ${String(count).padStart(2)} (${pct}%)`;
  });
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize: '0.82rem',
        lineHeight: '1.5',
        background: '#0d0d0f',
        padding: '0.75rem 1rem',
        borderRadius: 4,
        color: '#c9d1d9',
        margin: 0,
        overflowX: 'auto',
      }}
    >
      {`MAX_NEIGHBOURS histogram (${nRuns} races)\n` + lines.join('\n')}
    </pre>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DiagnoseVerteilung() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(CLOSED_TRACKS[0]?.id ?? null);
  const [selectedTypeId, setSelectedTypeId] = useState('horse');
  const [runtimeSeconds, setRuntimeSeconds] = useState(4);
  const cancelRef = useRef(false);

  const selectedTrack = CLOSED_TRACKS.find((t) => t.id === selectedTrackId) ?? null;
  const maxRuntimeSeconds = selectedTrack
    ? computeTrackCap(selectedTrack, loadBaseSpeedConfig())
    : 50;

  const handleRun = useCallback(() => {
    cancelRef.current = false;
    setStatus('running');
    setProgress(0);
    setResults(null);

    const currentTrack = CLOSED_TRACKS.find((t) => t.id === selectedTrackId) ?? null;
    const trackConfig = currentTrack
      ? {
          pathLengthPx: currentTrack.pathLengthPx,
          trackWidthPx: currentTrack.width,
          laps: trackDefaultLaps(currentTrack),
        }
      : null;

    const frames = secondsToFrames(runtimeSeconds);
    const racerType = RACER_TYPES[selectedTypeId] ?? RACER_TYPES.horse;
    const rawOverrides = storageGet(KEYS.RACER_TYPE_OVERRIDES, {});
    const typeOverride = rawOverrides[selectedTypeId];
    const hasDisplaySizeOverride = !!(
      typeOverride &&
      typeof typeOverride === 'object' &&
      'displaySize' in typeOverride
    );

    const raceConfig = {
      nRacers: N_RACERS,
      baseSpeedConfig: loadBaseSpeedConfig(),
      behaviorConfig: loadRaceBehaviorConfig(),
      rowConfig: loadRowLayoutConfig(),
      dynamicsConfig: loadRaceDynamicsConfig(),
      racerTypeConfig: {
        bodyFillX: racerType.config.bodyFillX,
        bodyFillY: racerType.config.bodyFillY,
        displaySize: racerType.config.displaySize,
        hasDisplaySizeOverride,
      },
      autoScaleConfig: loadAutoScaleConfig(),
    };

    const allRuns = [];
    let capturedSpriteLengthInT = null;

    function runChunk(base) {
      if (cancelRef.current) {
        setStatus('idle');
        return;
      }
      const end = Math.min(base + CHUNK_SIZE, N_RUNS);

      for (let run = base; run < end; run++) {
        const { neighborCounts, spriteLengthInT } = simulateRace({
          ...raceConfig,
          seed: run * 7919 + 1,
          framesPerRace: frames,
          trackConfig,
        });
        if (capturedSpriteLengthInT === null) capturedSpriteLengthInT = spriteLengthInT;
        allRuns.push({
          maxNeighbors: Math.max(...neighborCounts),
          meanNeighbors: avg(neighborCounts),
          countWithMany: neighborCounts.filter((c) => c > 5).length,
          countWithNone: neighborCounts.filter((c) => c === 0).length,
        });
      }

      setProgress(end);

      if (end < N_RUNS) {
        setTimeout(() => runChunk(end), 0);
      } else {
        // Aggregate
        const maxArr = allRuns.map((r) => r.maxNeighbors);
        const meanArr = allRuns.map((r) => r.meanNeighbors);
        const withManyArr = allRuns.map((r) => r.countWithMany);
        const withNoneArr = allRuns.map((r) => r.countWithNone);
        const histogram = {};
        for (const v of maxArr) histogram[v] = (histogram[v] ?? 0) + 1;
        const maxMean = avg(maxArr);
        setResults({
          nRuns: allRuns.length,
          nRacers: N_RACERS,
          runtimeSeconds,
          maxMean,
          maxMedian: median(maxArr),
          max95: p95(maxArr),
          maxMax: Math.max(...maxArr),
          maxStddev: stddev(maxArr, maxMean),
          meanMean: avg(meanArr),
          withManyMean: avg(withManyArr),
          runsWithAny: withManyArr.filter((c) => c > 0).length,
          withNoneMean: avg(withNoneArr),
          histogram,
          spriteLengthInT: (
            capturedSpriteLengthInT ?? SPRITE_SIZE / DIRT_OVAL_PATH_LENGTH_PX
          ).toFixed(5),
          trackName: currentTrack?.name ?? 'Dirt Oval',
          rawRuns: allRuns,
        });
        setStatus('done');
      }
    }

    setTimeout(() => runChunk(0), 0);
  }, [selectedTypeId, runtimeSeconds, selectedTrackId]);

  const handleExport = useCallback(() => {
    if (!results) return;
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distribution-measurement-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const card = {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '1.25rem 1.5rem',
    marginBottom: '1rem',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        color: '#c9d1d9',
        fontFamily: 'system-ui, monospace',
        padding: '2rem',
        maxWidth: 860,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', color: '#e6edf3' }}>
        Empirical Distribution Measurement
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '2rem' }}>
        /diagnose-verteilung · {N_RACERS} racers · {selectedTrack?.name ?? '—'} · {N_RUNS} races ×{' '}
        {runtimeSeconds}s RACING time
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#8b949e', flexShrink: 0 }}>Track:</label>
        {CLOSED_TRACKS.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: '#f85149' }}>
            No closed tracks cached — visit the app first to populate geometry cache.
          </span>
        ) : (
          <select
            value={selectedTrackId ?? ''}
            onChange={(e) => {
              const newId = e.target.value;
              const newTrack = CLOSED_TRACKS.find((t) => t.id === newId);
              const newCap = newTrack ? computeTrackCap(newTrack, loadBaseSpeedConfig()) : 50;
              setSelectedTrackId(newId);
              setRuntimeSeconds((prev) => Math.min(prev, newCap));
            }}
            disabled={status === 'running'}
            style={{
              background: '#161b22',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: 6,
              padding: '0.4rem 0.75rem',
              fontSize: '0.9rem',
              cursor: status === 'running' ? 'not-allowed' : 'pointer',
            }}
          >
            {CLOSED_TRACKS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#8b949e', flexShrink: 0 }}>Racer Type:</label>
        <select
          value={selectedTypeId}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          disabled={status === 'running'}
          style={{
            background: '#161b22',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: 6,
            padding: '0.4rem 0.75rem',
            fontSize: '0.9rem',
            cursor: status === 'running' ? 'not-allowed' : 'pointer',
          }}
        >
          {Object.entries(RACER_TYPE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#8b949e', flexShrink: 0 }}>
          RACING runtime: {runtimeSeconds} s
        </label>
        <input
          type="range"
          min={1}
          max={maxRuntimeSeconds}
          step={1}
          value={runtimeSeconds}
          onChange={(e) => setRuntimeSeconds(Number(e.target.value))}
          disabled={status === 'running'}
          style={{ cursor: status === 'running' ? 'not-allowed' : 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleRun}
          disabled={status === 'running'}
          style={{
            background: status === 'running' ? '#21262d' : '#238636',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.5rem 1.2rem',
            cursor: status === 'running' ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {status === 'running' ? `Running… ${progress}/${N_RUNS}` : 'Run 50 Tests'}
        </button>
        <button
          onClick={handleExport}
          disabled={!results}
          style={{
            background: results ? '#1f6feb' : '#21262d',
            color: results ? '#fff' : '#8b949e',
            border: 'none',
            borderRadius: 6,
            padding: '0.5rem 1.2rem',
            cursor: results ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Export JSON
        </button>
      </div>

      {status === 'running' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(progress / N_RUNS) * 100}%`,
                background: '#238636',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '0.4rem' }}>
            Simulating… {progress}/{N_RUNS}
          </p>
        </div>
      )}

      {results && (
        <>
          <div style={card}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#e6edf3' }}>
              Aggregate table ({results.nRuns} races)
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>
                {[
                  ['MAX_NEIGHBOURS — mean over 50 races', results.maxMean.toFixed(2)],
                  ['MAX_NEIGHBOURS — median', results.maxMedian.toFixed(1)],
                  ['MAX_NEIGHBOURS — 95th percentile', results.max95],
                  ['MAX_NEIGHBOURS — highest single value', results.maxMax],
                  ['MEAN_NEIGHBOURS — mean over 50 races', results.meanMean.toFixed(2)],
                  ['Racers with >5 neighbours — mean', results.withManyMean.toFixed(2)],
                  [
                    'Races with ≥1 racer with >5 neighbours',
                    `${results.runsWithAny}/${results.nRuns}`,
                  ],
                  ['Racers with no neighbours — mean', results.withNoneMean.toFixed(2)],
                  ['Standard deviation MAX_NEIGHBOURS', results.maxStddev.toFixed(2)],
                  ['spriteLengthInT (neighbour threshold |Δt|<)', results.spriteLengthInT],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: '#58a6ff' }}>
                      {k}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', color: '#e6edf3' }}>
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#e6edf3' }}>
              One-line summary
            </h2>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              In {results.nRuns} races with {N_RACERS} racers on {results.trackName}, after{' '}
              {results.runtimeSeconds}s the maximum number of side-by-side neighbours is on average{' '}
              <strong style={{ color: '#58a6ff' }}>{results.maxMean.toFixed(1)}</strong>, at most{' '}
              <strong style={{ color: '#f85149' }}>{results.maxMax}</strong>, and in 95% of races no
              more than <strong style={{ color: '#3fb950' }}>{results.max95}</strong>.
            </p>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#e6edf3' }}>
              Histogram
            </h2>
            <AsciiHistogram histogram={results.histogram} nRuns={results.nRuns} />
          </div>

          <div style={card}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#e6edf3' }}>
              Interpretation
            </h2>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
              {results.maxMean >= 6
                ? '⚠️  High density — on average more than 6 racers side by side. Anti-collision logic is critical.'
                : results.maxMean >= 3
                  ? '⚡ Medium density — collisions occur regularly. Priority system addresses the most common cases.'
                  : '✅ Low density — few simultaneous neighbours. Priority system is a preventive measure.'}{' '}
              Critical threshold ({'>'} 5 neighbours) in{' '}
              <strong>
                {results.runsWithAny}/{results.nRuns}
              </strong>{' '}
              races.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
