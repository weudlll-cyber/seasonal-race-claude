// ============================================================
// File:        setup.js
// Path:        client/src/test/setup.js
// Project:     RaceArena
// Description: Vitest global test setup — jest-dom matchers and jsdom polyfills
// ============================================================

import '@testing-library/jest-dom';

// Mock SVGPathElement geometry for jsdom — getTotalLength and getPointAtLength
// are not implemented by jsdom. We intercept createElementNS and inject them
// on every path element instance at creation time.
(function installSvgPathMock() {
  if (typeof document === 'undefined') return;

  function parsePath(d) {
    const m = d && d.match(/M\s*([\d.]+)[\s,]+([\d.]+)/i);
    const sx = m ? +m[1] : 0;
    const sy = m ? +m[2] : 0;
    const closed = d ? /z\s*$/i.test(d.trim()) : false;
    if (closed) return { sx, sy, ex: sx, ey: sy, closed: true };
    const nums = d ? [...d.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)/g)].map((n) => +n[0]) : [];
    return {
      sx,
      sy,
      ex: nums[nums.length - 2] ?? sx,
      ey: nums[nums.length - 1] ?? sy,
      closed: false,
    };
  }

  function mockLength(d) {
    const { sx, sy, ex, ey, closed } = parsePath(d);
    if (closed) return 1000;
    const dx = ex - sx;
    const dy = ey - sy;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  function mockPoint(d, len) {
    const { sx, sy, ex, ey, closed } = parsePath(d);
    if (closed) {
      // Ellipse centred on the grid so points are well-distributed
      const t = (len / 1000) * 2 * Math.PI;
      return {
        x: 500 + 300 * Math.cos(t - Math.PI / 2),
        y: 300 + 200 * Math.sin(t - Math.PI / 2),
      };
    }
    const total = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) || 1;
    const t = Math.max(0, Math.min(1, len / total));
    return { x: sx + (ex - sx) * t, y: sy + (ey - sy) * t };
  }

  const _orig = document.createElementNS.bind(document);
  document.createElementNS = function (ns, localName) {
    const el = _orig(ns, localName);
    if (localName === 'path') {
      el.getTotalLength = function () {
        return mockLength(this.getAttribute('d') ?? '');
      };
      el.getPointAtLength = function (len) {
        return mockPoint(this.getAttribute('d') ?? '', len);
      };
    }
    return el;
  };
})();
