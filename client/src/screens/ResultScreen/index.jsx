// ============================================================
// File:        index.jsx
// Path:        client/src/screens/ResultScreen/index.jsx
// Project:     RaceArena
// Created:     2026-04-20
// Description: Post-race results screen — podium, rankings, and history tracking
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useFadeNavigate } from '../../contexts/TransitionContext.jsx';
import { storageGet, storageSet, KEYS, newId } from '../../modules/storage/storage';
import { formatRaceTime } from '../../utils/formatRaceTime.js';
import { useActiveBrandProfile } from '../../modules/branding/useActiveBrandProfile.js';
import './ResultScreen.css';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_RACE_DEFAULTS } from '../../modules/storage/defaults.js';

function ResultScreen() {
  const navigate = useFadeNavigate();
  const [finishOrder, setFinishOrder] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [race, setRace] = useState(null);
  // React 18 StrictMode fires every effect twice in dev (mount → unmount → remount).
  // This ref survives the simulated unmount and prevents a double history write.
  const hasSaved = useRef(false);

  const activeBrand = useActiveBrandProfile();

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

  return (
    <div className="screen screen--result">
      <div className="results-container">
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
              </div>
            )}
          </div>
        ) : (
          race && (
            <div className="race-info">
              <span className="race-track">{race.trackName || 'Track'}</span>
              <span className="race-time">{elapsedTime}s</span>
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
              <div className="podium-slot podium-slot--2nd">
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
              <div className="podium-slot podium-slot--1st">
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
              <div className="podium-slot podium-slot--3rd">
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
          <div className="rankings-section">
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
        <div className="results-actions">
          <button className="btn btn--primary" onClick={handleReturnToSetup}>
            ← Back to Setup
          </button>
        </div>

        {/* Sponsor strip — grey footer, unchanged */}
        {race?.sponsorText && <div className="result-sponsor">{race.sponsorText}</div>}
      </div>
    </div>
  );
}

export default ResultScreen;
