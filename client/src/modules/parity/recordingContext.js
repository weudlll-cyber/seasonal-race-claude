// ============================================================
// File:        recordingContext.js
// Path:        client/src/modules/parity/recordingContext.js
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// WHAT THIS IS FOR: standing in for a real `CanvasRenderingContext2D` and recording the SEQUENCE of
// drawing operations performed against it — which sprite at which position and size, which text
// where, which fill style, in which order — so the sequence can be hashed.
//
// WHY CALLS AND NOT PIXELS. Hashing the rendered image would drag in a rasteriser, a GPU, font
// rendering and anti-aliasing, and the baseline would then hold on one machine rather than on the
// repository. Recording the calls is fully deterministic, environment-independent, and fast enough
// to run in every camera block — which is the difference between an instrument and a ceremony
// nobody performs. It also dissolves the exact-versus-tolerant argument: there is nothing to be
// tolerant about.
//
// WHAT IT IS NOT FOR, stated so nobody over-trusts it. It is blind to two things by construction:
//   1. THE RASTERISER. If `fillRect` itself started painting the wrong pixels, this would not know.
//   2. THE ARTWORK. Sprites are recorded by identity, not content — redraw a rocket and the hash is
//      unchanged. The owner's eye is the right instrument for that, and it is the one thing his eye
//      is unambiguously better at than any hash.
// Neither is what a refactor breaks, which is the case this exists for. A THIRD blindness belongs
// to the HARNESS rather than to this file — which layers it manages to exercise at all — and is
// stated in scripts/render-fingerprint.mjs.
//
// TEXT MEASUREMENT IS SYNTHETIC, and this is the one place the recorder is not merely passive.
// `measureText` has to return something, and the name-tag layout consumes its width to decide which
// labels are drawn. A real browser's metric depends on the installed font. So this returns a
// deterministic synthetic width. The consequence, stated plainly: the fingerprint pins the tag
// layout ALGORITHM (same widths in, same labels out) and NOT the label count a real browser would
// produce. A change to font metrics is invisible here; a change to the layout rule is not.
// ============================================================

import { createHash } from './hashing.js';

/** Screen-pixel resolution the recorder rounds coordinates to before hashing. */
const COORD_PRECISION = 1e4;

/** Canvas state properties whose assignment is a recordable drawing decision. */
const STATE_PROPS = [
  'fillStyle',
  'strokeStyle',
  'font',
  'globalAlpha',
  'lineWidth',
  'lineCap',
  'lineJoin',
  'textAlign',
  'textBaseline',
  'shadowBlur',
  'shadowColor',
  'shadowOffsetX',
  'shadowOffsetY',
  'globalCompositeOperation',
  'imageSmoothingEnabled',
  'imageSmoothingQuality',
  'filter',
];

/** Methods recorded by name and rounded arguments. */
const VOID_METHODS = [
  'save',
  'restore',
  'beginPath',
  'closePath',
  'fill',
  'stroke',
  'clip',
  'moveTo',
  'lineTo',
  'quadraticCurveTo',
  'bezierCurveTo',
  'arc',
  'arcTo',
  'ellipse',
  'rect',
  'roundRect',
  'fillRect',
  'strokeRect',
  'clearRect',
  'fillText',
  'strokeText',
  'translate',
  'rotate',
  'scale',
  'transform',
  'setTransform',
  'resetTransform',
  'setLineDash',
];

const round = (v) =>
  typeof v === 'number'
    ? Number.isFinite(v)
      ? Math.round(v * COORD_PRECISION) / COORD_PRECISION
      : String(v)
    : v;

/**
 * Identify an image argument WITHOUT reading its pixels: by `src` when it has one, else by a lazily
 * assigned stable id. Two draws of the same sprite must record the same token, and two draws of
 * different sprites must not.
 */
let imageSeq = 0;
const imageIds = new WeakMap();
function imageToken(img) {
  if (img == null) return 'null';
  if (typeof img === 'string') return 'str:' + img;
  if (typeof img.src === 'string' && img.src) return 'src:' + img.src;
  if (typeof img.__raId === 'string') return img.__raId;
  if (!imageIds.has(img)) imageIds.set(img, 'img#' + ++imageSeq);
  return imageIds.get(img);
}

/**
 * A recording stand-in for a 2D canvas context.
 *
 * @param {object} [opts]
 * @param {number} [opts.width=1280]
 * @param {number} [opts.height=720]
 * @param {(text:string, font:string)=>number} [opts.measureWidth]
 *   Synthetic text metric. The default is deterministic and font-size aware; pass your own only if
 *   you have a reason, and expect the fingerprint to move if you do.
 * @param {boolean} [opts.keepOps=false]  retain every op in memory (diagnosis; off by default so a
 *   ten-track run stays flat in memory)
 */
export function createRecordingContext(opts = {}) {
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const keepOps = opts.keepOps ?? false;
  const ops = [];
  const hash = createHash();
  let count = 0;

  const measureWidth =
    opts.measureWidth ??
    ((text, font) => {
      // Deterministic and monotone in both length and font size, which is all the layout rule needs.
      const m = /(\d+(?:\.\d+)?)px/.exec(font ?? '');
      const px = m ? parseFloat(m[1]) : 10;
      return String(text).length * px * 0.55;
    });

  const emit = (line) => {
    count++;
    hash.update(line);
    hash.update('\n');
    if (keepOps) ops.push(line);
  };

  const ctx = {
    canvas: { width, height },

    measureText(text) {
      // NOT recorded: measuring is a QUESTION, not a mark on the canvas, and the answer already
      // shows up in the fillText that follows. Recording it would make the hash sensitive to how
      // often the layout asks rather than to what it draws.
      return { width: measureWidth(String(text), ctx.font) };
    },

    createLinearGradient(...args) {
      return makeGradient('linear', args, emit);
    },
    createRadialGradient(...args) {
      return makeGradient('radial', args, emit);
    },
    createPattern() {
      return { __raGradient: 'pattern' };
    },

    drawImage(img, ...rest) {
      emit('drawImage ' + imageToken(img) + ' ' + rest.map(round).join(' '));
    },

    /** The recorded stream so far, as a hex digest. */
    digest() {
      return hash.digest();
    },
    /** How many operations were recorded — a coarse sanity reading, not part of the hash. */
    get opCount() {
      return count;
    },
    /** Recorded lines, when keepOps was set. Used to LOCATE a difference once one is known. */
    get ops() {
      return ops;
    },
  };

  for (const name of VOID_METHODS) {
    ctx[name] = (...args) => emit(name + ' ' + args.map(gradientAware).map(round).join(' '));
  }

  for (const prop of STATE_PROPS) {
    let value;
    Object.defineProperty(ctx, prop, {
      get: () => value,
      set: (v) => {
        // Record the ASSIGNMENT, not the value at draw time. A style set and then overwritten
        // without drawing anything is a real difference in the call stream and shows up as one.
        value = v;
        emit(prop + '=' + gradientAware(v));
      },
      enumerable: true,
      configurable: true,
    });
  }

  return ctx;
}

function makeGradient(kind, args, emit) {
  const spec = kind + '(' + args.map(round).join(',') + ')';
  const stops = [];
  emit('createGradient ' + spec);
  return {
    __raGradient: spec,
    addColorStop(offset, color) {
      stops.push(round(offset) + ':' + color);
      emit('addColorStop ' + spec + ' ' + round(offset) + ' ' + color);
    },
    get __raStops() {
      return stops;
    },
  };
}

/** Gradients and patterns stringify by their spec, so a style set from one is comparable. */
function gradientAware(v) {
  return v && typeof v === 'object' && v.__raGradient ? 'grad:' + v.__raGradient : v;
}
