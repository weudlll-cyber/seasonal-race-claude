// ============================================================
// File:        TrackSelector.jsx
// Path:        client/src/screens/SetupScreen/TrackSelector.jsx
// Project:     RaceArena
// Created:     2026-04-19
// Description: Visual card grid for choosing a track type; renders whatever
//              tracks are passed in — custom tracks from the Dev Panel are
//              included automatically via the parent's storage read
// ============================================================

import styles from './SetupScreen.module.css';

function TrackSelector({ tracks, selectedTrackId, onChange }) {
  if (!tracks || tracks.length === 0) {
    return (
      <p
        style={{
          color: 'var(--color-muted)',
          fontSize: '0.85rem',
          textAlign: 'center',
          padding: '1.5rem 0',
        }}
      >
        No tracks configured. Add tracks in the ⚙️ Dev Panel.
      </p>
    );
  }

  return (
    <div className={styles.trackGrid}>
      {tracks.map((track) => (
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
          <span className={styles.trackDescription}>{track.description}</span>
          <div className={styles.trackColorBar} />
        </button>
      ))}
    </div>
  );
}

export default TrackSelector;
