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
import { storageGet } from '../../modules/storage/storage';
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

  const simulationRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Initialize race
  useEffect(() => {
    // Get race data from session storage
    const activeRace = sessionStorage.getItem('activeRace');
    if (!activeRace) {
      navigate('/setup');
      return;
    }

    const race = JSON.parse(activeRace);
    setRaceData(race);
    setRacers(race.racers);

    // Create renderer
    if (canvasRef.current) {
      rendererRef.current = createCanvasRenderer(canvasRef.current);
      rendererRef.current.initTrack(race.trackId, 800, 500);
    }

    // Create particle effects
    particlesRef.current = createParticleEffects();

    // Create simulation
    const raceDefaults = storageGet('racearena:raceDefaults', { duration: 60 });
    simulationRef.current = createRaceSimulation(race.racers, 1);
  }, [navigate]);

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

  return (
    <div className="screen screen--race">
      <div className="race-container">
        {/* Canvas */}
        <div className="race-canvas-wrapper">
          <canvas ref={canvasRef} className="race-canvas" />

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
