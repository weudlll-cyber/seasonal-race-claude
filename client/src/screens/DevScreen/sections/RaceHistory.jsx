// ============================================================
// File:        RaceHistory.jsx
// Path:        client/src/screens/DevScreen/sections/RaceHistory.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: View, filter, export and clear the race history — and, since RACE-HISTORY-4, THE
//              TEAM'S races from the server, each with the short key it can be read aloud by and a
//              button that runs it again.
//
// ── ★ WHY THIS SCREEN AND NOT A NEW ONE (RACE-HISTORY-4) ────────────────────────────────────────
// The history already lived here, and this section is `tier: 'operator'` (DevScreen.jsx:95) behind
// a `/dev` route with no `requiredRole` — so every race director already reaches it, which is the
// owner's requirement. There was no admin-only problem to solve and therefore no reason to build a
// second history somewhere else. It is EXTENDED in place, and the tree has exactly one race list.
//
// ── WHAT THIS FILE OWNS AND WHAT IT DELIBERATELY DOES NOT ───────────────────────────────────────
// It owns the LIST: which rows exist, what each says, and what its button arms. It does NOT start
// races — `repeatRace.armRepeat` prepares one and `SetupScreen.startRaceFromIdentifier` runs it,
// which is the same single path the `run it again` control has always used. It does not decide
// whose races these are either: the team comes from the session, server-side, and this screen
// cannot ask for another one.
//
// Editing, deleting, sharing, favourites and search are deliberately absent. Export and Clear are
// older than this piece, act on the LOCAL history only, and are left exactly as they were.
//
// ── TWO SOURCES, AND A ROW NEVER PRETENDS TO BE THE OTHER ───────────────────────────────────────
// The server holds the team's races; this device holds its own, some of which have not gone up yet
// (RACE-SAVE-3). A race that HAS gone up is shown once, from the server, because that is where its
// short key lives. A race that has not is shown too — it is the owner's race and it exists — with
// its state said plainly and no key, because it has none to show.
// ============================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { useServerTracks } from '../../../modules/storage/useServerTracks.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { DEFAULT_RACE_HISTORY } from '../../../modules/storage/defaults.js';
import { InfoTooltip } from '../../../components/InfoTooltip/index.js';
import { SYNC } from '../../../modules/raceHistory.js';
import { armRepeat } from '../../../modules/repeatRace.js';
import { fetchRacesPage } from '../../../services/racesApi.js';
import s from '../DevScreen.module.css';

/** How many of the team's races one page holds. Paginated from the first version, by design. */
const PAGE_SIZE = 20;

/** What a row says about where it lives. `stored` is the only one that carries a key. */
const STATE_LABEL = {
  stored: { text: 'stored', color: 'var(--color-muted)' },
  [SYNC.PENDING]: { text: 'not sent yet', color: '#e0a800' },
  [SYNC.FAILED]: { text: 'could not be sent', color: '#e63946' },
  local: { text: 'this device only', color: 'var(--color-muted)' },
};

/**
 * One row's shape, whichever store it came from.
 *
 * The two stores name the same facts differently — the server keeps `finishedAt`/`elapsedSec` and
 * the local entry keeps `date`/`duration` — so they are reconciled HERE, once, rather than at every
 * place the table reads one.
 */
function rowFromServerRace(race) {
  return {
    rowId: `server:${race.id}`,
    date: race.finishedAt,
    trackId: null,
    geometryId: race.geometryId,
    duration: race.elapsedSec,
    playerCount: race.names?.length ?? 0,
    seed: race.racePlanSeed,
    winners: race.winners ?? [],
    shortKey: race.shortKey,
    state: 'stored',
    // The hydrated race carries every input field by the same names `identifierForStoredInputs`
    // reads, so it IS the repeat's input set — nothing is rebuilt from this machine.
    inputs: race,
  };
}

function rowFromLocalEntry(entry) {
  return {
    rowId: `local:${entry.id}`,
    date: entry.date,
    trackId: entry.trackId,
    geometryId: entry.inputs?.geometryId ?? null,
    duration: entry.duration,
    playerCount: entry.playerCount,
    seed: entry.seed,
    winners: entry.winners ?? [],
    shortKey: null, // it has none: nothing has issued one, and inventing one here would be a lie
    state: entry.sync?.state ?? 'local',
    syncError: entry.sync?.error ?? null,
    inputs: entry.inputs ?? null,
  };
}

function RaceHistory() {
  const [history, setHistory] = useStorage(KEYS.RACE_HISTORY, DEFAULT_RACE_HISTORY);
  const tracks = useServerTracks();
  const navigate = useNavigate();
  const [filterTrack, setFilterTrack] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // The team's races, one page at a time.
  const [page, setPage] = useState({ races: [], hasMore: false, team: null });
  const [offset, setOffset] = useState(0);
  const [serverState, setServerState] = useState({ loading: true, error: null });
  const [repeatError, setRepeatError] = useState(null);

  const loadPage = useCallback(async (at) => {
    setServerState({ loading: true, error: null });
    try {
      const data = await fetchRacesPage({ limit: PAGE_SIZE, offset: at });
      setPage(data);
      setServerState({ loading: false, error: null });
    } catch (err) {
      // The server being unreachable is NOT an error state for this screen: the local races below
      // are still real and still repeatable, and SERVER-GONE-1's banner already says the server is
      // not answering. The line here says only what is missing.
      setPage({ races: [], hasMore: false, team: null });
      setServerState({ loading: false, error: err?.message ?? String(err) });
    }
  }, []);

  useEffect(() => {
    loadPage(offset);
  }, [loadPage, offset]);

  // The LOCAL history, filtered — the same value Export CSV and Clear have always acted on, kept
  // as it was so neither changes behaviour.
  const filtered = useMemo(() => {
    return history.filter((entry) => {
      if (filterTrack && entry.trackId !== filterTrack) return false;
      if (filterDate && !entry.date.startsWith(filterDate)) return false;
      return true;
    });
  }, [history, filterTrack, filterDate]);

  /**
   * The rows the table shows: this device's UNSENT races first, then the team's page.
   *
   * A race that reached the server is shown from the SERVER copy only — that is the one with a key
   * — so `sent` local entries are dropped here rather than appearing twice.
   */
  const rows = useMemo(() => {
    const unsent = filtered
      .filter((e) => e.sync?.state !== SYNC.SENT)
      .map(rowFromLocalEntry)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const stored = page.races.map(rowFromServerRace).filter((r) => {
      if (filterDate && !String(r.date).startsWith(filterDate)) return false;
      if (filterTrack) {
        const track = tracks.find((t) => t.id === filterTrack);
        return !!track && track.geometryId === r.geometryId;
      }
      return true;
    });

    return [...unsent, ...stored];
  }, [filtered, page.races, filterDate, filterTrack, tracks]);

  function trackFor(row) {
    return (
      tracks.find((t) => t.id === row.trackId) ??
      tracks.find((t) => row.geometryId && t.geometryId === row.geometryId) ??
      null
    );
  }

  /**
   * ★ RUN THIS RACE AGAIN — the everyday path, one control, no dialog.
   *
   * It arms the repeat from the STORED inputs and hands over to the setup screen, which starts it.
   * Nothing here reads this machine's current settings, which is the whole point of the store: the
   * race that runs is the race that ran.
   */
  function handleRepeat(row) {
    setRepeatError(null);
    try {
      armRepeat(row.inputs);
    } catch (err) {
      setRepeatError(
        `This race cannot be run again here: ${err?.message ?? String(err)}. ` +
          'Its recorded settings could not be turned back into a race.'
      );
      return;
    }
    navigate('/setup');
  }

  function handleExportCSV() {
    const header = 'Date,Track,Duration (s),Players,Seed,Winners';
    const rows_ = filtered.map((e) => {
      const track = tracks.find((t) => t.id === e.trackId);
      return [
        e.date,
        track ? track.name : e.trackId,
        e.duration,
        e.playerCount,
        // SEED-REAL-RACE-1: null for a race recorded before the seed existed, and for the legacy
        // unseeded 0. An empty cell says 'not reproducible'; a 0 would read like a seed.
        e.seed ?? '',
        (e.winners ?? []).join(' / '),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header, ...rows_].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `racearena-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    if (!window.confirm('Clear all race history? This cannot be undone.')) return;
    setHistory([]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filter bar */}
      <div className={s.card}>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Every race your team has run, newest first, and the ones still on this device. Each stored
          race has a short key you can read out to somebody else — they can type it into the seed
          field to run the same race. <strong>Run again</strong> repeats a race exactly as it ran,
          whatever this machine is set to now.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className={s.formGroup} style={{ minWidth: '160px' }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Filter by Track
              <InfoTooltip text="Show only races on the selected track. Pick 'All tracks' to see every race regardless of track." />
            </label>
            <select
              className={s.select}
              value={filterTrack}
              onChange={(e) => setFilterTrack(e.target.value)}
            >
              <option value="">All tracks</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className={s.formGroup} style={{ minWidth: '160px' }}>
            <label
              className={s.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Filter by Date
              <InfoTooltip text="Show only races within this time period. Useful for narrowing down to a specific event day or recent weeks." />
            </label>
            <input
              className={s.input}
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className={s.btnRow} style={{ marginBottom: '0.05rem' }}>
            <button
              className={`${s.btn} ${s.btnGhost}`}
              onClick={() => {
                setFilterTrack('');
                setFilterDate('');
              }}
            >
              Clear Filters
            </button>
            <button
              className={`${s.btn} ${s.btnSecondary}`}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
            >
              Export CSV
            </button>
            <button
              className={`${s.btn} ${s.btnDanger}`}
              onClick={handleClear}
              disabled={history.length === 0}
            >
              Clear History
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={s.card}>
        {page.team && (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Team: <strong>{page.team}</strong>
          </p>
        )}
        {serverState.error && (
          <p
            role="status"
            data-testid="history-server-error"
            style={{ fontSize: '0.78rem', color: '#e0a800', marginBottom: '0.5rem' }}
          >
            Your team&rsquo;s stored races could not be loaded. The races still on this device are
            listed below and can still be run again.
          </p>
        )}
        {repeatError && (
          <p
            role="alert"
            data-testid="repeat-error"
            style={{ fontSize: '0.78rem', color: '#e63946' }}
          >
            {repeatError}
          </p>
        )}

        {serverState.loading && (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
            Loading your team&rsquo;s races…
          </p>
        )}
        {/* The empty state does NOT wait on the server. This device's own races are already known
            the moment the screen renders, so "no races recorded yet" is a statement about them and
            stays true whether or not the team's page has arrived. */}
        {rows.length === 0 ? (
          <p className={s.emptyState}>
            No races recorded yet. Races will appear here after they finish.
          </p>
        ) : (
          <table className={s.table} data-testid="race-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Track</th>
                <th>Duration</th>
                <th>Players</th>
                <th>Winners</th>
                <th>Key</th>
                <th> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const track = trackFor(row);
                const label = STATE_LABEL[row.state] ?? STATE_LABEL.local;
                return (
                  <tr key={row.rowId} data-testid={`history-row-${row.state}`}>
                    <td>{new Date(row.date).toLocaleString()}</td>
                    <td>
                      {track ? `${track.icon} ${track.name}` : (row.trackId ?? row.geometryId)}
                    </td>
                    <td>{row.duration != null ? `${row.duration}s` : '—'}</td>
                    <td>{row.playerCount}</td>
                    <td>{row.winners.join(', ')}</td>
                    <td>
                      {row.shortKey ? (
                        <code data-testid="short-key" style={{ letterSpacing: '1px' }}>
                          {row.shortKey}
                        </code>
                      ) : (
                        // ★ NO KEY, AND IT SAYS WHY. A race that has not reached the server has no
                        // key to show, and showing a blank cell would let it read as stored.
                        <span
                          data-testid="row-state"
                          title={row.syncError ?? undefined}
                          style={{ color: label.color, fontSize: '0.72rem' }}
                        >
                          {label.text}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`${s.btn} ${s.btnGhost}`}
                        data-testid="run-again"
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        // A race with no recorded inputs — an entry from before RACE-SAVE-3 — cannot
                        // be repeated, and the button says so rather than starting something else.
                        disabled={!row.inputs}
                        title={
                          row.inputs
                            ? 'Runs this race again exactly as it ran, whatever this machine is set to now.'
                            : 'This race was recorded before its settings were kept, so it cannot be repeated exactly.'
                        }
                        onClick={() => handleRepeat(row)}
                      >
                        Run again
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ★ Paginated from the first version, even with three rows. */}
        <div className={s.btnRow} style={{ marginTop: '0.75rem', alignItems: 'center' }}>
          <button
            className={`${s.btn} ${s.btnGhost}`}
            data-testid="history-prev"
            disabled={offset === 0 || serverState.loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            ← Newer
          </button>
          <button
            className={`${s.btn} ${s.btnGhost}`}
            data-testid="history-next"
            disabled={!page.hasMore || serverState.loading}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Older →
          </button>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
            {page.races.length > 0
              ? `stored races ${offset + 1}–${offset + page.races.length}`
              : 'no stored races on this page'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RaceHistory;
