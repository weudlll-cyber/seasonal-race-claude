// ============================================================
// File:        RaceHistory.jsx
// Path:        client/src/screens/DevScreen/sections/RaceHistory.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: View, filter, export, and clear the race history log
// ============================================================

import React, { useState, useMemo } from 'react';
import { useStorage } from '../../../modules/storage/useStorage.js';
import { KEYS } from '../../../modules/storage/storage.js';
import { DEFAULT_RACE_HISTORY, DEFAULT_TRACKS } from '../../../modules/storage/defaults.js';
import s from '../DevScreen.module.css';

function RaceHistory() {
  const [history, setHistory] = useStorage(KEYS.RACE_HISTORY, DEFAULT_RACE_HISTORY);
  const [tracks]              = useStorage(KEYS.TRACKS, DEFAULT_TRACKS);
  const [filterTrack, setFilterTrack] = useState('');
  const [filterDate, setFilterDate]   = useState('');

  const filtered = useMemo(() => {
    return history.filter((entry) => {
      if (filterTrack && entry.trackId !== filterTrack) return false;
      if (filterDate && !entry.date.startsWith(filterDate)) return false;
      return true;
    });
  }, [history, filterTrack, filterDate]);

  function handleExportCSV() {
    const header = 'Date,Track,Duration (s),Players,Winners';
    const rows = filtered.map((e) => {
      const track = tracks.find((t) => t.id === e.trackId);
      return [
        e.date,
        track ? track.name : e.trackId,
        e.duration,
        e.playerCount,
        e.winners.join(' / '),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header, ...rows].join('\n');
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
      <div className={s.card} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className={s.formGroup} style={{ minWidth: '160px' }}>
          <label className={s.label}>Filter by Track</label>
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
          <label className={s.label}>Filter by Date</label>
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
            onClick={() => { setFilterTrack(''); setFilterDate(''); }}
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

      {/* Table */}
      <div className={s.card}>
        {filtered.length === 0 ? (
          <p className={s.emptyState}>
            {history.length === 0
              ? 'No races recorded yet. Races will appear here after they finish.'
              : 'No results match the current filters.'}
          </p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Track</th>
                <th>Duration</th>
                <th>Players</th>
                <th>Winners</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const track = tracks.find((t) => t.id === entry.trackId);
                return (
                  <tr key={entry.id}>
                    <td>{new Date(entry.date).toLocaleString()}</td>
                    <td>
                      {track ? `${track.icon} ${track.name}` : entry.trackId}
                    </td>
                    <td>{entry.duration}s</td>
                    <td>{entry.playerCount}</td>
                    <td>{entry.winners.join(', ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RaceHistory;
