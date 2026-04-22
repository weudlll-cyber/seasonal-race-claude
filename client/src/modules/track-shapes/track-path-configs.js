// All track shapes defined as SVG path strings on a 1000×600 design grid.

export const TRACK_PATHS = {
  oval: {
    // Bezier approximation of ellipse (cx=500,cy=300,rx=430,ry=240) — arc commands fail in jsdom
    path: 'M 500,60 C 737,60 930,180 930,300 C 930,420 737,540 500,540 C 263,540 70,420 70,300 C 70,180 263,60 500,60 Z',
    closed: true,
    centerFrac: { x: 0.5, y: 0.5 },
  },
  's-curve': {
    path: 'M 30,300 C 150,300 200,120 350,120 C 500,120 500,480 650,480 C 800,480 850,300 970,300',
    closed: false,
  },
  spiral: {
    path: 'M 30,300 C 120,300 180,110 320,110 C 460,110 460,300 500,300 C 540,300 540,490 680,490 C 820,490 880,300 970,300',
    closed: false,
  },
  zigzag: {
    path: 'M 500,30 C 500,100 200,180 200,280 C 200,380 800,430 800,510 C 800,560 500,580 500,580',
    closed: false,
  },
  rectangle: {
    path: 'M 200,80 L 800,80 C 900,80 940,120 940,200 L 940,400 C 940,480 900,520 800,520 L 200,520 C 100,520 60,480 60,400 L 60,200 C 60,120 100,80 200,80 Z',
    closed: true,
    centerFrac: { x: 0.5, y: 0.5 },
  },
};
