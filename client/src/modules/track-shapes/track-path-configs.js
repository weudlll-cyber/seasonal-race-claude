// All track shapes defined as SVG path strings on a 1000×600 design grid.
// Each entry includes the path data and per-shape configuration.

export const TRACK_PATHS = {
  oval: {
    // Top moved to y=100 so the full track band clears the grandstand strip
    d: 'M 500,100 C 820,100 920,190 920,300 C 920,410 820,500 500,500 C 180,500 80,410 80,300 C 80,190 180,100 500,100 Z',
    isOpen: false,
    bw: { min: 160, max: 260, perLane: 28 },
    centerFrac: { x: 0.5, y: 0.5 },
  },
  's-curve': {
    d: 'M 30,300 C 150,300 200,120 350,120 C 500,120 500,480 650,480 C 800,480 850,300 970,300',
    isOpen: true,
    bw: { min: 120, max: 200, perLane: 24 },
  },
  spiral: {
    d: 'M 30,300 C 120,300 180,100 320,100 C 460,100 460,300 500,300 C 540,300 540,500 680,500 C 820,500 880,300 970,300',
    isOpen: true,
    bw: { min: 120, max: 200, perLane: 24 },
  },
  zigzag: {
    // Wide bottom-right turn replaces the sharp corner that caused lane crossings
    d: 'M 500,30 C 500,100 200,150 200,250 C 200,350 800,400 800,480 C 1100,570 1100,630 900,630 C 700,630 500,570 500,570',
    isOpen: true,
    bw: { min: 120, max: 200, perLane: 24 },
    centerFrac: { x: 0.5, y: 0.5 },
  },
  rectangle: {
    d: 'M 150,80 L 850,80 C 920,80 960,120 960,190 L 960,410 C 960,480 920,520 850,520 L 150,520 C 80,520 40,480 40,410 L 40,190 C 40,120 80,80 150,80 Z',
    isOpen: false,
    bw: { min: 120, max: 200, perLane: 24 },
    centerFrac: { x: 0.5, y: 0.517 },
  },
};
