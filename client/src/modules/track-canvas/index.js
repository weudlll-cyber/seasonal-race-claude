// ============================================================
// File:        index.js
// Path:        client/src/modules/track-canvas/index.js
// Project:     RaceArena
// Created:     2026-04-20
// Description: Track canvas generator — creates track geometry, draws track and racers
// ============================================================

/**
 * Generate oval track geometry (Bezier path around ellipse)
 * Returns array of {x, y} points along the track
 */
export function generateOvalTrack(width, height, resolution = 200) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width * 0.35;
  const radiusY = height * 0.3;
  const points = [];

  for (let i = 0; i < resolution; i++) {
    const angle = (i / resolution) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    points.push({ x, y });
  }

  return points;
}

/**
 * Get track layout object with draw info
 */
export function getTrackLayout(trackId, width, height) {
  const layouts = {
    'dirt-oval': {
      trackColor: '#8b7355',
      innerColor: '#d4a574',
      outerColor: '#4a4a4a',
      backgroundGradient: ['#d2a679', '#c9935c'],
      name: 'Dirt Oval',
    },
    'river-run': {
      trackColor: '#4a90e2',
      innerColor: '#2196f3',
      outerColor: '#1565c0',
      backgroundGradient: ['#81d4fa', '#4fc3f7'],
      name: 'River Run',
    },
    'space-sprint': {
      trackColor: '#1a1a2e',
      innerColor: '#16213e',
      outerColor: '#0f3460',
      backgroundGradient: ['#16213e', '#0f0f1e'],
      name: 'Space Sprint',
    },
  };

  return layouts[trackId] || layouts['dirt-oval'];
}

/**
 * Create canvas renderer
 */
export function createCanvasRenderer(canvas) {
  if (!canvas) throw new Error('Canvas element required');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  let trackPoints = [];
  let layout = null;

  return {
    /**
     * Initialize track with geometry
     */
    initTrack(trackId, width, height) {
      canvas.width = width;
      canvas.height = height;
      trackPoints = generateOvalTrack(width, height);
      layout = getTrackLayout(trackId, width, height);
    },

    /**
     * Draw background, track, and optional scroll effect
     */
    drawTrack(scrollOffset = 0) {
      if (!layout) return;

      const { width, height } = canvas;
      const [color1, color2] = layout.backgroundGradient;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw scrolling background lines for depth (sand/dust)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      for (let i = -5; i < 5; i++) {
        const y = (i * 40 + scrollOffset) % height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw outer barrier
      ctx.strokeStyle = layout.outerColor;
      ctx.lineWidth = 15;
      ctx.beginPath();
      for (let i = 0; i < trackPoints.length; i++) {
        const p = trackPoints[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw track surface
      ctx.strokeStyle = layout.trackColor;
      ctx.lineWidth = 60;
      ctx.beginPath();
      for (let i = 0; i < trackPoints.length; i++) {
        const p = trackPoints[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw inner lane marker
      ctx.strokeStyle = layout.innerColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let i = 0; i < trackPoints.length; i++) {
        const p = trackPoints[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw finish line (vertical at top)
      const finishX = canvas.width / 2;
      const finishY = canvas.height * 0.2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(finishX - 30, finishY);
      ctx.lineTo(finishX + 30, finishY);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    /**
     * Draw a single racer (horse) at track position
     */
    drawRacer(racer, trackPointIndex) {
      if (!trackPoints[trackPointIndex]) return;

      const p = trackPoints[trackPointIndex];
      const angle = this.getAngleAtPoint(trackPointIndex);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // Draw racer emoji/icon
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(racer.icon || '🐴', 0, 0);

      // Draw racer name label
      ctx.restore();
      ctx.save();
      ctx.font = '10px Arial';
      ctx.fillStyle = racer.color || '#000';
      ctx.textAlign = 'center';
      ctx.fillText(racer.name, p.x, p.y + 25);
      ctx.restore();
    },

    /**
     * Get angle (rotation) at a track point for racer orientation
     */
    getAngleAtPoint(index) {
      const current = trackPoints[index];
      const next = trackPoints[(index + 1) % trackPoints.length];
      return Math.atan2(next.y - current.y, next.x - current.x);
    },

    /**
     * Draw multiple racers
     */
    drawRacers(racers) {
      if (!trackPoints.length) return;
      for (const racer of racers) {
        const index = Math.round((racer.progress / 100) * (trackPoints.length - 1));
        this.drawRacer(racer, Math.min(index, trackPoints.length - 1));
      }
    },

    /**
     * Get canvas position for a racer at progress (0-100)
     */
    getRacerPosition(progress) {
      if (!trackPoints.length) return { x: 0, y: 0 };
      const index = Math.round((progress / 100) * (trackPoints.length - 1));
      return trackPoints[Math.min(index, trackPoints.length - 1)];
    },

    /**
     * Clear canvas
     */
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    /**
     * Get track points (for testing/reference)
     */
    getTrackPoints() {
      return trackPoints;
    },
  };
}
