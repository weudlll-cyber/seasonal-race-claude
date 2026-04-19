// ============================================================
// File:        TrackSelector.jsx
// Path:        client/src/screens/SetupScreen/TrackSelector.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Visual card grid for choosing a track type; each track has its
//              own color identity, icon, and short description
// ============================================================

import React from 'react';
import styles from './SetupScreen.module.css';

export const TRACKS = [
  {
    id: 'dirt-oval',
    name: 'Dirt Oval',
    icon: '🐴',
    racer: 'Horses',
    description: 'Classic oval on packed earth — tight turns, lots of dust.',
    color: '#a0522d',
  },
  {
    id: 'river-run',
    name: 'River Run',
    icon: '🦆',
    racer: 'Ducks',
    description: 'Downstream sprint through meandering rapids and lily pads.',
    color: '#2196f3',
  },
  {
    id: 'space-sprint',
    name: 'Space Sprint',
    icon: '🚀',
    racer: 'Rockets',
    description: 'Zero-gravity dash past asteroids and nebula clouds.',
    color: '#7c3aed',
  },
  {
    id: 'garden-path',
    name: 'Garden Path',
    icon: '🐌',
    racer: 'Snails',
    description: 'A leisurely (yet surprisingly competitive) crawl through the roses.',
    color: '#16a34a',
  },
  {
    id: 'city-circuit',
    name: 'City Circuit',
    icon: '🚗',
    racer: 'Cars',
    description: 'High-speed urban track with hairpin corners and tunnel sections.',
    color: '#64748b',
  },
];

function TrackSelector({ selectedTrackId, onChange }) {
  return (
    <div className={styles.trackGrid}>
      {TRACKS.map((track) => (
        <button
          key={track.id}
          className={`${styles.trackCard} ${
            selectedTrackId === track.id ? styles.trackCardSelected : ''
          }`}
          style={{ '--track-color': track.color }}
          onClick={() => onChange(track.id)}
          title={track.name}
        >
          <span className={styles.trackIcon}>{track.icon}</span>
          <span className={styles.trackName}>{track.name}</span>
          <span className={styles.trackDescription}>
            {track.racer} · {track.description}
          </span>
          <div className={styles.trackColorBar} />
        </button>
      ))}
    </div>
  );
}

export default TrackSelector;
