// All track shapes defined as SVG path strings on a 1000×600 design grid.

export const TRACK_PATHS = {
  oval: {
    // Bezier approximation of ellipse (cx=500,cy=300,rx=430,ry=240) — arc commands fail in jsdom
    path: 'M 500,60 C 737,60 930,180 930,300 C 930,420 737,540 500,540 C 263,540 70,420 70,300 C 70,180 263,60 500,60 Z',
    closed: true,
    centerFrac: { x: 0.5, y: 0.5 },
    backgroundImage: 'dirt-oval.jpg',
  },
  's-curve': {
    // Space Sprint: single smooth diagonal arc, no inflection points
    path: 'M 40,480 C 40,480 200,480 400,200 C 600,0 900,0 960,150',
    closed: false,
    backgroundImage: 'space-sprint.jpg',
  },
  spiral: {
    // River Run: smooth S with gentle endpoint, no sharp kinks
    path: 'M 30,300 C 150,300 200,120 350,120 C 500,120 500,480 650,480 C 800,480 880,380 970,340',
    closed: false,
    backgroundImage: 'river-run.jpg',
  },
  zigzag: {
    // Garden Path: wide closed loop, clockwise, no sharp turns (Z closes like oval/rectangle; no degenerate CP1)
    path: 'M 850,80 C 950,80 950,400 850,520 C 750,600 350,600 250,520 C 150,440 150,160 250,80 C 350,0 750,0 850,80 Z',
    closed: true,
    centerFrac: { x: 0.5, y: 0.5 },
    backgroundImage: 'garden-path.jpg',
  },
  rectangle: {
    path: 'M 200,80 L 800,80 C 900,80 940,120 940,200 L 940,400 C 940,480 900,520 800,520 L 200,520 C 100,520 60,480 60,400 L 60,200 C 60,120 100,80 200,80 Z',
    closed: true,
    centerFrac: { x: 0.5, y: 0.5 },
    backgroundImage: 'city-circuit.jpg',
  },
};
