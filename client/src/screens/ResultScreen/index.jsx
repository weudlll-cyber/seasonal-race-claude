// ============================================================
// File:        index.js
// Path:        client/src/screens/ResultScreen/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Post-race results screen — podium, rankings, and history tracking
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageGet, storageSet, KEYS, newId } from '../../modules/storage/storage';
import './ResultScreen.css';

function ResultScreen() {
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [finishOrder, setFinishOrder] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [race, setRace] = useState(null);

  useEffect(() => {
    // Get results from session storage
    const raceResults = sessionStorage.getItem('raceResults');
    if (!raceResults) {
      navigate('/setup');
      return;
    }

    const parsed = JSON.parse(raceResults);
    setResults(parsed);
    setFinishOrder(parsed.finishOrder || []);
    setElapsedTime(parsed.elapsedTime || 0);
    setRace(parsed.race || {});

    // Save to race history
    const history = storageGet(KEYS.RACE_HISTORY, []);
    const historyEntry = {
      id: newId(),
      timestamp: new Date().toISOString(),
      trackId: parsed.race?.trackId,
      trackName: parsed.race?.trackName,
      players: parsed.race?.racers?.length || 0,
      winner: parsed.finishOrder?.[0]?.name,
      elapsedTime: parsed.elapsedTime,
      finishOrder: parsed.finishOrder,
    };
    history.unshift(historyEntry);
    storageSet(KEYS.RACE_HISTORY, history.slice(0, 100)); // Keep last 100
  }, [navigate]);

  const handleReturnToSetup = () => {
    sessionStorage.removeItem('activeRace');
    sessionStorage.removeItem('raceResults');
    navigate('/setup');
  };

  if (!finishOrder.length) {
    return <div className="screen screen--result loading">Loading...</div>;
  }

  const [first, second, third] = finishOrder;

  return (
    <div className="screen screen--result">
      <div className="results-container">
        <h1 className="results-title">🏁 Race Results</h1>

        {race && (
          <div className="race-info">
            <span className="race-track">{race.trackName || 'Track'}</span>
            <span className="race-time">{elapsedTime}s</span>
          </div>
        )}

        {/* Podium */}
        <div className="podium-section">
          <div className="podium">
            {/* Second place */}
            {second && (
              <div className="podium-slot podium-slot--2nd">
                <div className="podium-medal">🥈</div>
                <div className="podium-racer">
                  <div className="podium-icon">{second.icon}</div>
                  <div className="podium-name">{second.name}</div>
                </div>
                <div className="podium-rank">2nd</div>
              </div>
            )}

            {/* First place (center, tallest) */}
            {first && (
              <div className="podium-slot podium-slot--1st">
                <div className="podium-medal">🥇</div>
                <div className="podium-racer">
                  <div className="podium-icon">{first.icon}</div>
                  <div className="podium-name">{first.name}</div>
                </div>
                <div className="podium-rank">1st</div>
              </div>
            )}

            {/* Third place */}
            {third && (
              <div className="podium-slot podium-slot--3rd">
                <div className="podium-medal">🥉</div>
                <div className="podium-racer">
                  <div className="podium-icon">{third.icon}</div>
                  <div className="podium-name">{third.name}</div>
                </div>
                <div className="podium-rank">3rd</div>
              </div>
            )}
          </div>
        </div>

        {/* Full rankings */}
        <div className="rankings-section">
          <h2 className="rankings-title">Final Rankings</h2>
          <div className="rankings-table">
            {finishOrder.map((racer, index) => (
              <div key={racer.index} className="ranking-row">
                <span className="rank-number">#{index + 1}</span>
                <span className="rank-icon">{racer.icon}</span>
                <span className="rank-name">{racer.name}</span>
                <span className="rank-laps">{racer.lap} laps</span>
                <span className="rank-progress">{Math.round(racer.progress)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button className="btn btn--primary" onClick={handleReturnToSetup}>
            ← Back to Setup
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultScreen;
