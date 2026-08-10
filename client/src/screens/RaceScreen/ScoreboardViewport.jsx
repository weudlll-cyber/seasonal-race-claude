// ============================================================
// File:        ScoreboardViewport.jsx
// Path:        client/src/screens/RaceScreen/ScoreboardViewport.jsx
// Project:     RaceArena — SHIP-THE-STANDINGS
//
// THE SCROLLING WINDOW ONTO THE STANDINGS, AND ITS SCROLLBAR — which OVERLAYS the list instead of
// taking a column away from it.
//
// WHY IT IS HAND-BUILT, because the CSS answer does not exist on this platform. The panel is 210 px
// wide and every pixel of it is the racers' names. A native scrollbar on Windows Chrome is a CLASSIC
// scrollbar: it takes ~10 px of layout width for as long as it is there, and `scrollbar-gutter`
// solves the SHIFT by reserving that width permanently, which is the opposite of what is wanted here.
// `overflow: overlay` was the browser feature for exactly this and Chrome removed it. So the native
// bar is hidden and a thumb is drawn over the list: the rows keep the full width, and nothing moves
// when the list becomes scrollable.
//
// WHAT IT COSTS, said rather than implied: the thumb sits on the last ~5 px of the row, which is the
// right edge of the finish-time cell. The card already carries 3 px of right padding, so it overlaps
// the glyphs by about two pixels at most — and only while a race has finishers.
//
// IT IS A REAL SCROLLBAR, not an indicator: the wheel, the trackpad and the keyboard all still
// scroll the list because the element underneath is a genuine scroller, and the thumb can be
// dragged. Pointer capture is what makes the drag survive the pointer leaving a 5 px-wide target.
//
// THE THUMB IS WRITTEN IMPERATIVELY, in the same spirit as the rest of this list: scrolling is a
// user action rather than a per-frame one, but routing it through React state would re-render the
// hundred cards underneath it on every wheel notch, which is the one thing this whole line of work
// exists to stop.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** Nothing smaller than this can be grabbed with a mouse. */
const MIN_THUMB_PX = 24;

/**
 * @param {object} p
 * @param {number} p.contentHeightPx  the full height of the list inside — the thumb is re-sized when
 *   this changes, which is the only thing that can change it during a race (it cannot).
 * @param {React.ReactNode} p.children
 */
export default function ScoreboardViewport({ contentHeightPx, children }) {
  const scrollRef = useRef(null);
  const thumbRef = useRef(null);
  const barRef = useRef(null);
  const dragRef = useRef(null);

  /** Size and place the thumb from the scroller's current state. One read, two writes. */
  const sync = useCallback(() => {
    const el = scrollRef.current;
    const thumb = thumbRef.current;
    const bar = barRef.current;
    if (!el || !thumb || !bar) return;
    const track = el.clientHeight;
    const content = el.scrollHeight;
    if (content <= track + 1) {
      // Not scrollable: no bar at all, rather than a full-height thumb that looks like a scrollbar
      // and does nothing.
      bar.style.display = 'none';
      return;
    }
    bar.style.display = '';
    const h = Math.max(MIN_THUMB_PX, (track * track) / content);
    const travel = track - h;
    const y = travel * (el.scrollTop / (content - track));
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translateY(${y}px)`;
  }, []);

  useLayoutEffect(sync, [sync, contentHeightPx]);
  useEffect(() => {
    const onResize = () => sync();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [sync]);

  const onPointerDown = useCallback((e) => {
    const el = scrollRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;
    thumb.setPointerCapture(e.pointerId);
    dragRef.current = { y: e.clientY, top: el.scrollTop };
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      const el = scrollRef.current;
      const thumb = thumbRef.current;
      if (!drag || !el || !thumb) return;
      const track = el.clientHeight;
      const content = el.scrollHeight;
      const travel = track - thumb.getBoundingClientRect().height;
      if (travel <= 0) return;
      // The pointer moves along the TRACK; the list moves along the CONTENT. One ratio between them.
      el.scrollTop = drag.top + ((e.clientY - drag.y) * (content - track)) / travel;
      sync();
    },
    [sync]
  );

  const onPointerUp = useCallback((e) => {
    dragRef.current = null;
    thumbRef.current?.releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div className="scoreboard-viewport">
      <div className="scoreboard-scroll" ref={scrollRef} onScroll={sync}>
        {children}
      </div>
      <div className="scoreboard-scrollbar" ref={barRef}>
        <div
          className="scoreboard-thumb"
          ref={thumbRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}
