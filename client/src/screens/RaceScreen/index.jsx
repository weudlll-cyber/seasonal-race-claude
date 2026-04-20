// ============================================================
// File:        index.js
// Path:        client/src/screens/RaceScreen/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Live race screen — animated track, racers, HUD, countdown, results
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCanvasRenderer } from '../../modules/track-canvas';
import { createParticleEffects, PARTICLE_TYPES } from '../../modules/particle-effects';
import { createRaceSimulation } from '../../modules/race-simulation';
import './RaceScreen.css';

function RaceScreen() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('countdown'); // countdown, racing, finished
  const [countdown, setCountdown] = useState(3);
  const [raceData, setRaceData] = useState(null);
  const [racers, setRacers] = useState([]);
  const [finishOrder, setFinishOrder] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);

  const simulationRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Load race data from session storage
  useEffect(() => {
    try {
      const activeRace = sessionStorage.getItem('activeRace');
      if (!activeRace) {
        console.warn('[RaceScreen] No activeRace in sessionStorage, navigating to setup');
        navigate('/setup');
        return;
      }

      const race = JSON.parse(activeRace);
      setRaceData(race);
      setRacers(race.racers);
    } catch (err) {
      console.error('[RaceScreen] Failed to load race data:', err);
      setError('Failed to load race data');
      setTimeout(() => navigate('/setup'), 1000);
    }
  }, [navigate]);

  // Initialize canvas and modules after canvas is mounted
  useEffect(() => {
    if (!raceData || !canvasRef.current) return;

    try {
      // Create renderer with actual canvas element
      rendererRef.current = createCanvasRenderer(canvasRef.current);
      rendererRef.current.initTrack(raceData.trackId, 800, 500);

      // Create particle effects
      particlesRef.current = createParticleEffects();

      // Create simulation
      simulationRef.current = createRaceSimulation(raceData.racers, 1);
    } catch (err) {
      console.error('[RaceScreen] Failed to initialize race:', err);
      setError('Failed to initialize race');
    }
  }, [raceData]);

  // Countdown phase
  useEffect(() => {
    if (gameState !== 'countdown' || !raceData) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setGameState('racing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [gameState, raceData]);

  // Main animation loop
  useEffect(() => {
    if (gameState !== 'racing' || !rendererRef.current || !simulationRef.current) return;

    const animate = (now) => {
      const delta = lastUpdateRef.current ? now - lastUpdateRef.current : 16;
      lastUpdateRef.current = now;

      // Update simulation
      simulationRef.current.update(delta);
      const currentRacers = simulationRef.current.getRacers();
      const currentState = simulationRef.current.getState();

      // Emit particles for leading racer
      if (currentRacers.length > 0) {
        const leader = currentRacers.reduce((a, b) => (a.progress > b.progress ? a : b));
        if (leader.progress > 0 && leader.progress % 5 < 1) {
          const pos = rendererRef.current.getRacerPosition(leader.progress);
          particlesRef.current.emit(pos.x, pos.y, PARTICLE_TYPES.DUST, 3, 1);
        }
      }

      // Update particles
      particlesRef.current.update(delta);

      // Clear and draw
      rendererRef.current.clear();
      const scrollOffset = (currentState.time / 50) % 500;
      rendererRef.current.drawTrack(scrollOffset);
      particlesRef.current.draw(rendererRef.current.ctx);
      rendererRef.current.drawRacers(currentRacers);

      setRacers([...currentRacers]);
      setElapsedTime(simulationRef.current.getElapsedTime());

      // Check if finished
      if (simulationRef.current.isFinished()) {
        setGameState('finished');
        setFinishOrder(simulationRef.current.getFinishOrder());
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState]);

  // Advance to results
  useEffect(() => {
    if (gameState === 'finished' && finishOrder.length > 0) {
      const timer = setTimeout(() => {
        sessionStorage.setItem(
          'raceResults',
          JSON.stringify({
            race: raceData,
            finishOrder,
            elapsedTime,
          })
        );
        navigate('/results');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, finishOrder, raceData, elapsedTime, navigate]);

  const handleReturnToSetup = () => {
    sessionStorage.removeItem('activeRace');
    sessionStorage.removeItem('raceResults');
    navigate('/setup');
  };

  const handleManualStart = () => {
    // Fallback: manually create and start a test race
    const DEFAULT_RACERS = [
      { id: 'horse', name: 'Horse', icon: '🐴', color: '#a0522d' },
      { id: 'duck', name: 'Duck', icon: '🦆', color: '#2196f3' },
      { id: 'rocket', name: 'Rocket', icon: '🚀', color: '#7c3aed' },
      { id: 'snail', name: 'Snail', icon: '🐌', color: '#16a34a' },
      { id: 'car', name: 'Car', icon: '🚗', color: '#64748b' },
    ];

    const testRace = {
      racers: [
        { name: 'Test 1', icon: DEFAULT_RACERS[0].icon, racerId: DEFAULT_RACERS[0].id },
        { name: 'Test 2', icon: DEFAULT_RACERS[1].icon, racerId: DEFAULT_RACERS[1].id },
        { name: 'Test 3', icon: DEFAULT_RACERS[2].icon, racerId: DEFAULT_RACERS[2].id },
        { name: 'Test 4', icon: DEFAULT_RACERS[3].icon, racerId: DEFAULT_RACERS[3].id },
        { name: 'Test 5', icon: DEFAULT_RACERS[4].icon, racerId: DEFAULT_RACERS[4].id },
      ],
      trackId: 'dirt-oval',
      trackName: 'Dirt Oval',
      duration: 60,
      eventName: 'Manual Test',
      winners: 3,
      timestamp: new Date().toISOString(),
    };

    console.log('[RaceScreen] Starting manual test race:', testRace);
    sessionStorage.setItem('activeRace', JSON.stringify(testRace));
    setRaceData(testRace);
    setRacers(testRace.racers);
  };

  return (
    <div className="screen screen--race">
      {/* Debug Info - Visible on screen */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.9)',
          color: '#0f0',
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '12px',
          zIndex: 999,
          maxWidth: '400px',
          maxHeight: '500px',
          overflow: 'auto',
          border: '2px solid #0f0',
        }}
      >
        <div>
          <strong>DEBUG INFO</strong>
        </div>
        <div>raceData: {raceData ? 'LOADED' : 'MISSING'}</div>
        <div>error: {error || 'none'}</div>
        <div>gameState: {gameState}</div>
        <div>racers count: {racers.length}</div>
        {raceData && (
          <>
            <div>trackId: {raceData.trackId}</div>
            <div>event: {raceData.eventName}</div>
            <div>
              racers:
              {raceData.racers.map((r) => (
                <div key={r.name}>
                  - {r.name} ({r.icon})
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#0a0' }}>
          sessionStorage.activeRace: {sessionStorage.getItem('activeRace') ? 'EXISTS' : 'MISSING'}
        </div>
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #0f0' }}>
          <button
            onClick={handleManualStart}
            style={{
              background: '#0f0',
              color: '#000',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              marginBottom: '5px',
              width: '100%',
            }}
          >
            START TEST RACE
          </button>
          <button
            onClick={() => navigate('/setup')}
            style={{
              background: '#f00',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              width: '100%',
            }}
          >
            BACK TO SETUP
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 1000,
            color: '#f00',
            fontSize: '20px',
            flexDirection: 'column',
            gap: '20px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>❌ ERROR</div>
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error}</div>
          <button
            onClick={() => navigate('/setup')}
            style={{
              padding: '10px 20px',
              background: '#f00',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Back to Setup
          </button>
        </div>
      )}

      {!raceData && !error && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 1000,
            color: '#fff',
            fontSize: '20px',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div>⏳ Loading race data...</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            sessionStorage keys: {Object.keys(sessionStorage).join(', ') || 'none'}
          </div>
        </div>
      )}

      <div className="race-container">
        {/* Canvas */}
        <div className="race-canvas-wrapper">
          <canvas ref={canvasRef} className="race-canvas" width={800} height={500} />

          {/* Countdown overlay */}
          {gameState === 'countdown' && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdown}</div>
            </div>
          )}

          {/* Finish announcement */}
          {gameState === 'finished' && finishOrder.length > 0 && (
            <div className="finish-overlay">
              <h2>🏁 {finishOrder[0].name} Wins!</h2>
            </div>
          )}
        </div>

        {/* HUD */}
        <div className="race-hud">
          {/* Scoreboard */}
          <div className="scoreboard">
            <div className="scoreboard-header">POSITIONS</div>
            {racers
              .sort((a, b) => b.progress - a.progress)
              .slice(0, 5)
              .map((racer, i) => (
                <div key={racer.index} className="scoreboard-row">
                  <span className="position">{i + 1}</span>
                  <span className="racer-name">
                    {racer.icon} {racer.name}
                  </span>
                  <span className="progress">{Math.floor(racer.progress)}%</span>
                </div>
              ))}
          </div>

          {/* Timer */}
          <div className="timer">
            <span className="timer-label">TIME</span>
            <span className="timer-value">{elapsedTime}s</span>
          </div>

          {/* Buttons */}
          <div className="race-controls">
            <button
              className="btn btn--secondary"
              onClick={handleReturnToSetup}
              disabled={gameState !== 'finished'}
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RaceScreen;
